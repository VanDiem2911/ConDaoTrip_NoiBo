import bcrypt from "bcryptjs";
import { ApiError, apiUser, body, num, route, str } from "@/lib/api";
import { BACKOFFICE } from "@/lib/access";
import { col, newId, nowIso } from "@/lib/db";
import type { Role, User } from "@/lib/types";

/** Tạo tài khoản nhân viên (Sale / Điều hành / Kế toán) */
export const POST = route(async (req) => {
  await apiUser(BACKOFFICE);
  const b = await body(req);
  const role = str(b.role) as Role;
  if (!["sale", "operator", "accountant"].includes(role)) throw new ApiError(400, "Vai trò không hợp lệ");
  const name = str(b.name);
  const email = str(b.email).toLowerCase();
  const password = typeof b.password === "string" ? b.password : "";
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, "Nhập họ tên và email hợp lệ");
  if (password.length < 8) throw new ApiError(400, "Mật khẩu tối thiểu 8 ký tự");
  const users = await col<User>("users");
  if (await users.findOne({ email })) throw new ApiError(409, "Email đã tồn tại");
  const u: User = {
    _id: newId(), name, email, role, phone: str(b.phone) || undefined,
    commissionRate: role === "sale" ? Math.min(100, Math.max(0, num(b.commissionRate, 10))) : undefined,
    passwordHash: await bcrypt.hash(password, 10), active: true, createdAt: nowIso(),
  };
  await users.insertOne(u);
  return { id: u._id };
});
