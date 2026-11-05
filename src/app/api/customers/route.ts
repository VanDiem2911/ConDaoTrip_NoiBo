import { ApiError, apiUser, body, route, str } from "@/lib/api";
import { BACKOFFICE } from "@/lib/access";
import { col, newId, nowIso, ser } from "@/lib/db";
import type { Customer } from "@/lib/types";

export const POST = route(async (req) => {
  const user = await apiUser(BACKOFFICE);
  const b = await body(req);
  const name = str(b.name);
  if (!name) throw new ApiError(400, "Vui lòng nhập tên khách hàng / đại lý");
  const doc: Customer = {
    _id: newId(), name, kind: str(b.kind) === "agent" ? "agent" : "individual",
    contactName: str(b.contactName) || undefined, phone: str(b.phone) || undefined, email: str(b.email) || undefined,
    country: str(b.country) || undefined, note: str(b.note) || undefined,
    saleId: user.role === "sale" ? user.id : str(b.saleId) || undefined, createdAt: nowIso(),
  };
  await (await col<Customer>("customers")).insertOne(doc);
  return { customer: ser(doc) };
});
