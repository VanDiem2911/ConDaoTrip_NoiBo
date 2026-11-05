import { ApiError, apiUser, body, num, route, str } from "@/lib/api";
import { BACKOFFICE } from "@/lib/access";
import { col, newId, nowIso } from "@/lib/db";
import { todayIso } from "@/lib/money";
import type { Booking, Transaction, TxKind } from "@/lib/types";

/** Ghi nhận khách thanh toán: đặt cọc / tạm ứng / thanh toán — tự vào sổ Thu - Chi */
export const POST = route<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const user = await apiUser(BACKOFFICE);
  const b = await body(req);
  const booking = await (await col<Booking>("bookings")).findOne({ _id: id });
  if (!booking) throw new ApiError(404, "Không tìm thấy booking");
  const amount = Math.round(num(b.amountVnd));
  if (amount <= 0) throw new ApiError(400, "Số tiền phải lớn hơn 0");
  const kind = (["deposit", "advance", "payment"] as TxKind[]).includes(str(b.kind) as TxKind) ? (str(b.kind) as TxKind) : "payment";
  const tx: Transaction = {
    _id: newId(), type: "thu", kind, amountVnd: amount, date: str(b.date) || todayIso(),
    method: str(b.method) || "Chuyển khoản", bookingId: id, bookingCode: booking.code,
    partyName: booking.customerName, note: str(b.note) || undefined, createdBy: user.id, createdAt: nowIso(),
  };
  await (await col<Transaction>("transactions")).insertOne(tx);
  return { id: tx._id };
});
