import { ApiError, apiUser, body, num, route, str } from "@/lib/api";
import { BACKOFFICE } from "@/lib/access";
import { col, newId, nowIso } from "@/lib/db";
import { todayIso } from "@/lib/money";
import type { Booking, Transaction, TxKind, User } from "@/lib/types";

/** Ghi sổ Thu - Chi thủ công (chi phí vận hành, thu khác, chi hoa hồng cho nhân viên...) */
export const POST = route(async (req) => {
  const user = await apiUser(BACKOFFICE);
  const b = await body(req);
  const type = b.type === "thu" ? "thu" : "chi";
  const kinds: TxKind[] = type === "thu" ? ["income", "payment", "deposit", "advance"] : ["expense", "commission", "supplier"];
  const kind = kinds.includes(str(b.kind) as TxKind) ? (str(b.kind) as TxKind) : type === "thu" ? "income" : "expense";
  const amount = Math.round(num(b.amountVnd));
  if (amount <= 0) throw new ApiError(400, "Số tiền phải lớn hơn 0");
  const tx: Transaction = {
    _id: newId(), type, kind, amountVnd: amount, date: str(b.date) || todayIso(), method: str(b.method) || "Chuyển khoản",
    partyName: str(b.partyName) || undefined, note: str(b.note) || undefined, createdBy: user.id, createdAt: nowIso(),
  };
  if (str(b.bookingId)) {
    const bk = await (await col<Booking>("bookings")).findOne({ _id: str(b.bookingId) });
    if (bk) { tx.bookingId = bk._id; tx.bookingCode = bk.code; tx.partyName ??= bk.customerName; }
  }
  if (kind === "commission" && str(b.userId)) {
    const u = await (await col<User>("users")).findOne({ _id: str(b.userId) });
    if (u) { tx.userId = u._id; tx.userName = u.name; tx.partyName = u.name; }
  }
  await (await col<Transaction>("transactions")).insertOne(tx);
  return { id: tx._id };
});
