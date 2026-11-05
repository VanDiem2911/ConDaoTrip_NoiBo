import { ApiError, apiUser, body, num, route, str } from "@/lib/api";
import { BACKOFFICE } from "@/lib/access";
import { col, newId, nowIso } from "@/lib/db";
import { todayIso } from "@/lib/money";
import type { Supplier, Transaction } from "@/lib/types";

/** Thanh toán công nợ cho nhà cung cấp -> ghi vào sổ chi */
export const POST = route<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const user = await apiUser(BACKOFFICE);
  const b = await body(req);
  const s = await (await col<Supplier>("suppliers")).findOne({ _id: id });
  if (!s) throw new ApiError(404, "Không tìm thấy nhà cung cấp");
  const amount = Math.round(num(b.amountVnd));
  if (amount <= 0) throw new ApiError(400, "Số tiền phải lớn hơn 0");
  const tx: Transaction = {
    _id: newId(), type: "chi", kind: "supplier", amountVnd: amount, date: str(b.date) || todayIso(),
    method: str(b.method) || "Chuyển khoản", supplierId: id, supplierName: s.name, partyName: s.name,
    note: str(b.note) || "Thanh toán công nợ NCC", createdBy: user.id, createdAt: nowIso(),
  };
  await (await col<Transaction>("transactions")).insertOne(tx);
  return { id: tx._id };
});
