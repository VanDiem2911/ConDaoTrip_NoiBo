import { ApiError, apiUser, route } from "@/lib/api";
import { BACKOFFICE } from "@/lib/access";
import { col } from "@/lib/db";
import type { Transaction } from "@/lib/types";

/** Điều hành & Kế toán dùng được mọi tính năng, gồm xoá bút toán */
export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  const { id } = await params;
  await apiUser(BACKOFFICE);
  const r = await (await col<Transaction>("transactions")).deleteOne({ _id: id });
  if (!r.deletedCount) throw new ApiError(404, "Không tìm thấy giao dịch");
  return { ok: true };
});
