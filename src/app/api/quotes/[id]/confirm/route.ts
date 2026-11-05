import { ApiError, apiUser, route } from "@/lib/api";
import { col } from "@/lib/db";
import { confirmQuote } from "@/lib/quote-service";
import type { Quote } from "@/lib/types";

export const POST = route<{ id: string }>(async (_req, { params }) => {
  const { id } = await params;
  const user = await apiUser();
  const quotes = await col<Quote>("quotes");
  const q = await quotes.findOne({ _id: id });
  if (!q) throw new ApiError(404, "Không tìm thấy báo giá");
  const mine = q.createdBy === user.id || (user.customerId && q.customerId === user.customerId) || q.saleId === user.id;
  if (user.role !== "operator" && user.role !== "accountant" && !mine) throw new ApiError(403, "Bạn không có quyền xác nhận báo giá này");
  return confirmQuote(q, user);
});
