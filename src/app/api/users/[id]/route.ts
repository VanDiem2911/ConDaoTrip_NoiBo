import { ApiError, apiUser, body, num, route } from "@/lib/api";
import { BACKOFFICE } from "@/lib/access";
import { col } from "@/lib/db";
import { invalidate } from "@/lib/cache";
import type { User } from "@/lib/types";

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const me = await apiUser(BACKOFFICE);
  const b = await body(req);
  const set: Partial<User> = {};
  if (b.commissionRate !== undefined) set.commissionRate = Math.min(100, Math.max(0, num(b.commissionRate)));
  if (typeof b.active === "boolean") {
    if (id === me.id && !b.active) throw new ApiError(400, "Không thể tự khoá tài khoản của mình");
    set.active = b.active;
  }
  if (!Object.keys(set).length) throw new ApiError(400, "Không có thay đổi");
  const r = await (await col<User>("users")).updateOne({ _id: id }, { $set: set });
  if (!r.matchedCount) throw new ApiError(404, "Không tìm thấy tài khoản");
  invalidate("user:");
  return { ok: true };
});
