import { ApiError, apiUser, body, num, route, str } from "@/lib/api";
import { BACKOFFICE } from "@/lib/access";
import { col, nowIso } from "@/lib/db";
import type { Booking, Supplier } from "@/lib/types";

/**
 * Điều hành xếp dịch vụ: chọn NCC (hoặc để trống nếu tự làm), giá vốn (từ bảng giá NCC hoặc nhập tay),
 * thông tin dịch vụ đã xếp (nhập tay). { unarrange: true } để đưa về trạng thái chờ xếp.
 */
export const PATCH = route<{ id: string; lineId: string }>(async (req, { params }) => {
  const { id, lineId } = await params;
  const user = await apiUser(BACKOFFICE);
  const b = await body(req);
  const bookings = await col<Booking>("bookings");
  const booking = await bookings.findOne({ _id: id });
  const idx = booking?.lines.findIndex((l) => l.id === lineId) ?? -1;
  if (!booking || idx < 0) throw new ApiError(404, "Không tìm thấy dịch vụ cần xếp");
  const key = `lines.${idx}`;

  if (b.unarrange) {
    await bookings.updateOne({ _id: id }, {
      $set: { [`${key}.status`]: "pending" },
      $unset: { [`${key}.supplierId`]: "", [`${key}.supplierName`]: "", [`${key}.costVnd`]: "", [`${key}.arrangeInfo`]: "", [`${key}.arrangedBy`]: "", [`${key}.arrangedAt`]: "" },
    });
    return { ok: true };
  }

  const info = str(b.arrangeInfo);
  const cost = Math.max(0, Math.round(num(b.costVnd)));
  let supplierId: string | undefined;
  let supplierName: string | undefined;
  if (str(b.supplierId)) {
    const s = await (await col<Supplier>("suppliers")).findOne({ _id: str(b.supplierId) });
    if (!s) throw new ApiError(400, "Nhà cung cấp không tồn tại");
    supplierId = s._id;
    supplierName = s.name;
  }
  if (!supplierId && !info) throw new ApiError(400, "Chọn nhà cung cấp hoặc nhập thông tin dịch vụ đã xếp");

  const set: Record<string, unknown> = {
    [`${key}.status`]: "arranged", [`${key}.costVnd`]: cost, [`${key}.arrangeInfo`]: info,
    [`${key}.arrangedBy`]: user.name, [`${key}.arrangedAt`]: nowIso(),
  };
  const unset: Record<string, ""> = {};
  if (supplierId) { set[`${key}.supplierId`] = supplierId; set[`${key}.supplierName`] = supplierName; }
  else { unset[`${key}.supplierId`] = ""; unset[`${key}.supplierName`] = ""; }
  await bookings.updateOne({ _id: id }, Object.keys(unset).length ? { $set: set, $unset: unset } : { $set: set });
  return { ok: true };
});
