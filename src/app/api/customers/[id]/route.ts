import { ApiError, apiUser, body, route, str } from "@/lib/api";
import { BACKOFFICE, isBackoffice } from "@/lib/access";
import { col } from "@/lib/db";
import type { Customer } from "@/lib/types";

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const user = await apiUser(BACKOFFICE);
  const b = await body(req);
  const c = await col<Customer>("customers");
  const filter = isBackoffice(user.role) ? { _id: id } : { _id: id, saleId: user.id };
  const set: Record<string, unknown> = {};
  for (const k of ["name", "contactName", "phone", "email", "country", "note"] as const) if (b[k] !== undefined) set[k] = str(b[k]);
  if (b.kind === "agent" || b.kind === "individual") set.kind = b.kind;
  if (isBackoffice(user.role) && b.saleId !== undefined) set.saleId = str(b.saleId) || undefined;
  if (set.name === "") throw new ApiError(400, "Tên không được trống");
  const r = await c.updateOne(filter, { $set: set });
  if (!r.matchedCount) throw new ApiError(404, "Không tìm thấy khách hàng");
  return { ok: true };
});
