import { ApiError, apiUser, body, num, route, str } from "@/lib/api";
import { BACKOFFICE } from "@/lib/access";
import { col } from "@/lib/db";
import type { Booking, User } from "@/lib/types";

/** Điều hành/Kế toán: đổi sale phụ trách, % hoa hồng, huỷ booking */
export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  await apiUser(BACKOFFICE);
  const b = await body(req);
  const set: Partial<Booking> = {};
  if (b.saleId !== undefined) {
    const sid = str(b.saleId);
    if (sid) {
      const sale = await (await col<User>("users")).findOne({ _id: sid, role: "sale" });
      if (!sale) throw new ApiError(400, "Sale không hợp lệ");
      set.saleId = sale._id;
      set.saleName = sale.name;
    }
  }
  if (b.commissionRate !== undefined) set.commissionRate = Math.min(100, Math.max(0, num(b.commissionRate)));
  if (b.status === "cancelled") set.status = "cancelled";
  if (!Object.keys(set).length) throw new ApiError(400, "Không có thay đổi");
  const r = await (await col<Booking>("bookings")).updateOne({ _id: id }, { $set: set });
  if (!r.matchedCount) throw new ApiError(404, "Không tìm thấy booking");
  return { ok: true };
});
