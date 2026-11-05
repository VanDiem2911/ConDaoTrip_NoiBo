import { ApiError, apiUser, body, num, route, str } from "@/lib/api";
import { BACKOFFICE } from "@/lib/access";
import { col } from "@/lib/db";
import { invalidate } from "@/lib/cache";
import type { Service, Tour } from "@/lib/types";

/** Chỉnh giá bán tham khảo / mở – đóng tour hoặc dịch vụ (type = tours | services) */
export const PATCH = route<{ type: string; id: string }>(async (req, { params }) => {
  const { type, id } = await params;
  await apiUser(BACKOFFICE);
  if (type !== "tours" && type !== "services") throw new ApiError(404, "Không tìm thấy");
  const b = await body(req);
  const set: Record<string, unknown> = {};
  if (b.priceVnd !== undefined) set.priceVnd = Math.max(0, Math.round(num(b.priceVnd)));
  if (typeof b.active === "boolean") set.active = b.active;
  if (type === "tours" && b.priceNote !== undefined) set.priceNote = str(b.priceNote);
  if (!Object.keys(set).length) throw new ApiError(400, "Không có thay đổi");
  const r =
    type === "tours"
      ? await (await col<Tour>("tours")).updateOne({ _id: id }, { $set: set })
      : await (await col<Service>("services")).updateOne({ _id: id }, { $set: set });
  if (!r.matchedCount) throw new ApiError(404, "Không tìm thấy");
  invalidate("catalog");
  return { ok: true };
});
