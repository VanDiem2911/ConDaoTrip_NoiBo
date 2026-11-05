import { ApiError, body, route, str } from "@/lib/api";
import { createSession } from "@/lib/auth";
import { col } from "@/lib/db";
import type { User } from "@/lib/types";

/** Chỉ các tài khoản mẫu do `npm run seed` tạo mới vào nhanh được */
const DEMO_EMAILS = [
  "dieuhanh@condaotrip.demo",
  "ketoan@condaotrip.demo",
  "sale.bao@condaotrip.demo",
  "doitac@condaotrip.demo",
];

/** Đăng nhập nhanh bằng 1 cú bấm (không cần mật khẩu). Tắt bằng biến môi trường DEMO_LOGIN=off */
export const POST = route(async (req) => {
  if (process.env.DEMO_LOGIN === "off") throw new ApiError(403, "Đăng nhập nhanh đã được tắt");
  const email = str((await body(req)).email).toLowerCase();
  if (!DEMO_EMAILS.includes(email)) throw new ApiError(403, "Không phải tài khoản dùng thử");
  const user = await (await col<User>("users")).findOne({ email });
  if (!user || !user.active) throw new ApiError(404, "Tài khoản dùng thử chưa có trong dữ liệu (chạy npm run seed)");
  await createSession(user._id);
  return { ok: true, role: user.role };
});
