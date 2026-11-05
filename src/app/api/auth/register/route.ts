import bcrypt from "bcryptjs";
import { ApiError, body, route, str } from "@/lib/api";
import { createSession } from "@/lib/auth";
import { col, newId, nowIso } from "@/lib/db";
import type { Customer, User } from "@/lib/types";

/** Tự đăng ký tài khoản Khách hàng / Đối tác (nhân viên do Điều hành/Kế toán tạo trong Cài đặt) */
export const POST = route(async (req) => {
  const b = await body(req);
  const name = str(b.name);
  const email = str(b.email).toLowerCase();
  const password = typeof b.password === "string" ? b.password : "";
  if (!name) throw new ApiError(400, "Vui lòng nhập họ tên / tên công ty");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, "Email không hợp lệ");
  if (password.length < 8) throw new ApiError(400, "Mật khẩu tối thiểu 8 ký tự");
  const users = await col<User>("users");
  if (await users.findOne({ email })) throw new ApiError(409, "Email này đã được đăng ký");

  const customerId = newId();
  await (await col<Customer>("customers")).insertOne({
    _id: customerId, name, kind: str(b.kind) === "agent" ? "agent" : "individual",
    phone: str(b.phone) || undefined, email, country: str(b.country) || undefined, createdAt: nowIso(),
  });
  const id = newId();
  await users.insertOne({
    _id: id, name, email, phone: str(b.phone) || undefined, role: "customer", customerId,
    passwordHash: await bcrypt.hash(password, 10), active: true, createdAt: nowIso(),
  });
  await createSession(id);
  return { ok: true };
});
