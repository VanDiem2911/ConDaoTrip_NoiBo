"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./toast";

export async function http<T = Record<string, unknown>>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Có lỗi xảy ra, vui lòng thử lại");
  return data as T;
}

/** Chạy 1 thao tác gọi API: trạng thái loading, toast thành công/lỗi, làm mới dữ liệu trang */
export function useAction() {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async <T,>(fn: () => Promise<T>, success?: string, opts: { refresh?: boolean } = {}): Promise<T | undefined> => {
      setPending(true);
      try {
        const r = await fn();
        if (success) toast(success);
        if (opts.refresh !== false) router.refresh();
        return r;
      } catch (e) {
        toast(e instanceof Error ? e.message : "Có lỗi xảy ra", "error");
        return undefined;
      } finally {
        setPending(false);
      }
    },
    [router, toast],
  );
  return { run, pending, router };
}
