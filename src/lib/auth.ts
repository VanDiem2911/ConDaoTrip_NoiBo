import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { col } from "./db";
import type { Role, SessionUser, User } from "./types";

const COOKIE = "cdt_session";
const MAX_AGE = 60 * 60 * 24 * 7;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET chưa được cấu hình (>= 32 ký tự)");
  return new TextEncoder().encode(s);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** Đọc user hiện tại từ cookie, luôn nạp lại từ DB để role/trạng thái luôn mới nhất */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const users = await col<User>("users");
    const u = await users.findOne({ _id: String(payload.uid) });
    if (!u || !u.active) return null;
    return {
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      phone: u.phone,
      commissionRate: u.commissionRate,
      customerId: u.customerId,
      active: u.active,
    };
  } catch {
    return null;
  }
});

/** Dùng trong Server Component / layout: bắt buộc đăng nhập (và đúng vai trò) */
export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect("/");
  return user;
}
