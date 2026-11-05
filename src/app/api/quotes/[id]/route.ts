import { ApiError, apiUser, body, route } from "@/lib/api";
import { col, nowIso } from "@/lib/db";
import { getQuote } from "@/lib/data";
import { normalizeQuote } from "@/lib/quote-service";
import type { Quote } from "@/lib/types";

export const PUT = route<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const user = await apiUser();
  const existing = await getQuote(id, user);
  if (!existing) throw new ApiError(404, "Không tìm thấy báo giá");
  if (existing.status !== "draft") throw new ApiError(400, "Báo giá đã xác nhận, không thể sửa");
  const data = await normalizeQuote(await body(req), user);
  await (await col<Quote>("quotes")).updateOne({ _id: id }, { $set: data });
  return { id };
});

export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  const { id } = await params;
  const user = await apiUser();
  const existing = await getQuote(id, user);
  if (!existing) throw new ApiError(404, "Không tìm thấy báo giá");
  if (existing.status !== "draft") throw new ApiError(400, "Chỉ huỷ được báo giá nháp");
  await (await col<Quote>("quotes")).updateOne({ _id: id }, { $set: { status: "cancelled", updatedAt: nowIso() } });
  return { ok: true };
});
