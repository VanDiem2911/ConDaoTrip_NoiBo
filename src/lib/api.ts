import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth";
import type { Role, SessionUser } from "./types";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function apiUser(roles?: Role[]): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) throw new ApiError(401, "Chưa đăng nhập");
  if (roles && !roles.includes(u.role)) throw new ApiError(403, "Bạn không có quyền thực hiện thao tác này");
  return u;
}

type Ctx<P> = { params: Promise<P> };

/** Bọc route handler: bắt lỗi và trả JSON thống nhất */
export function route<P = Record<string, string>>(
  fn: (req: Request, ctx: Ctx<P>) => Promise<unknown>,
) {
  return async (req: Request, ctx: Ctx<P>) => {
    try {
      const data = await fn(req, ctx);
      return NextResponse.json(data ?? { ok: true });
    } catch (e) {
      if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
      console.error(e);
      return NextResponse.json({ error: "Lỗi hệ thống, vui lòng thử lại" }, { status: 500 });
    }
  };
}

export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError(400, "Dữ liệu gửi lên không hợp lệ");
  }
}

export const num = (v: unknown, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};
export const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
