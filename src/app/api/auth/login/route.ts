import bcrypt from "bcryptjs";
import { ApiError, body, route, str } from "@/lib/api";
import { createSession } from "@/lib/auth";
import { col } from "@/lib/db";
import type { User } from "@/lib/types";

export const POST = route(async (req) => {
  const b = await body(req);
  const email = str(b.email).toLowerCase();
  const password = typeof b.password === "string" ? b.password : "";
  if (!email || !password) throw new ApiError(400, "Vui lòng nhập email và mật khẩu");
  const user = await (await col<User>("users")).findOne({ email });
  const ok = user && user.active && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw new ApiError(401, "Email hoặc mật khẩu không đúng");
  await createSession(user._id);
  return { ok: true, role: user.role };
});
