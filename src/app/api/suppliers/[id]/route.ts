import { ApiError, apiUser, body, num, route, str } from "@/lib/api";
import { BACKOFFICE } from "@/lib/access";
import { col } from "@/lib/db";
import { uid } from "@/lib/pricing";
import { SERVICE_CATEGORIES, type Supplier } from "@/lib/types";

/** Sửa thông tin NCC, thêm/xoá dòng bảng giá đầu vào, ngừng hợp tác */
export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  await apiUser(BACKOFFICE);
  const b = await body(req);
  const c = await col<Supplier>("suppliers");
  const set: Record<string, unknown> = {};
  for (const k of ["name", "contactName", "phone", "email", "address", "bank", "note"] as const) {
    if (b[k] !== undefined) set[k] = str(b[k]);
  }
  if (set.name === "") throw new ApiError(400, "Tên nhà cung cấp không được trống");
  if (Array.isArray(b.categories)) set.categories = b.categories.map(String).filter((x) => x in SERVICE_CATEGORIES);
  if (typeof b.active === "boolean") set.active = b.active;
  const ops: Record<string, unknown> = {};
  if (Object.keys(set).length) ops.$set = set;
  if (b.addPrice && typeof b.addPrice === "object") {
    const p = b.addPrice as Record<string, unknown>;
    if (!str(p.name)) throw new ApiError(400, "Nhập tên dịch vụ trong bảng giá");
    ops.$push = { prices: { id: uid(), name: str(p.name), category: str(p.category) || "other", unit: str(p.unit) || "lượt", costVnd: Math.max(0, Math.round(num(p.costVnd))) } };
  }
  if (str(b.removePrice)) ops.$pull = { prices: { id: str(b.removePrice) } };
  if (!Object.keys(ops).length) throw new ApiError(400, "Không có thay đổi");
  const r = await c.updateOne({ _id: id }, ops);
  if (!r.matchedCount) throw new ApiError(404, "Không tìm thấy nhà cung cấp");
  return { ok: true };
});
