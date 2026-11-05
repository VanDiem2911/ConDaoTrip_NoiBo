"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import type { NavItem } from "@/lib/access";
import { ROLE_LABEL, type Role } from "@/lib/types";
import { NavGlyph } from "./nav-icon";
import { Avatar, cn } from "./ui";

export function AppShell({
  nav, user, children,
}: {
  nav: NavItem[]; user: { name: string; email: string; role: Role }; children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"));

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const sidebar = (
    <div className="flex h-full flex-col px-4 pb-4 pt-5">
      <Link href="/" aria-label="ConDaoTrip – Tổng quan" className="mb-6 block rounded-2xl px-2 py-1 focus-ring">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.svg" alt="ConDaoTrip" width={230} height={74} className="h-[58px] w-auto" />
        <span className="mt-1 block pl-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-400">Quản lý nội bộ</span>
      </Link>

      <nav aria-label="Menu chính" className="-mx-1 flex-1 space-y-1 overflow-y-auto px-1">
        {nav.map((n) => {
          const on = active(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "group flex h-12 items-center gap-3.5 rounded-2xl px-3.5 text-[15px] font-medium transition-all duration-200",
                on
                  ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-[0_10px_24px_-10px_rgba(17,154,72,.9)] ring-1 ring-white/20"
                  : "text-brand-100/85 hover:bg-white/10 hover:text-white",
              )}
            >
              <NavGlyph name={n.icon} className={cn("size-[22px] shrink-0 transition-transform group-hover:scale-110", on ? "text-white" : "text-brand-200/80")} />
              <span className="truncate">{n.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 rounded-2xl bg-white/8 p-3 ring-1 ring-white/10">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="truncate text-xs text-brand-200/80">{ROLE_LABEL[user.role]}</p>
          </div>
          <button type="button" onClick={logout} aria-label="Đăng xuất" title="Đăng xuất" className="grid size-10 place-items-center rounded-xl text-brand-100 transition-colors hover:bg-white/12 hover:text-white">
            <LogOut className="size-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-shell min-h-dvh">
      {/* Thanh trên cho điện thoại */}
      <header className="app-topbar sticky top-0 z-30 flex h-14 items-center justify-between bg-brand-900/95 px-4 backdrop-blur lg:hidden">
        <Link href="/" aria-label="ConDaoTrip – Tổng quan" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.svg" alt="ConDaoTrip" width={100} height={32} className="h-8 w-auto" />
        </Link>
        <button type="button" onClick={() => setOpen(true)} aria-label="Mở menu" aria-expanded={open} className="grid size-11 place-items-center rounded-xl text-white hover:bg-white/10">
          <Menu className="size-6" />
        </button>
      </header>

      {/* Sidebar cố định (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[17.5rem] lg:block">{sidebar}</aside>

      {/* Ngăn kéo (mobile) */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-brand-950/70" onClick={() => setOpen(false)} />
          <div className="bg-shell anim-pop absolute inset-y-0 left-0 w-[19rem] max-w-[88vw] shadow-[var(--shadow-pop)]">
            <button type="button" onClick={() => setOpen(false)} aria-label="Đóng menu" className="absolute right-3 top-4 z-10 grid size-10 place-items-center rounded-xl text-white hover:bg-white/10">
              <X className="size-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <main className="app-main bg-panel min-h-[calc(100dvh-3.5rem)] px-4 pb-16 pt-6 sm:px-6 lg:ml-[17.5rem] lg:my-2 lg:mr-2 lg:min-h-[calc(100dvh-1rem)] lg:rounded-[28px] lg:px-8 lg:pt-8 lg:shadow-[0_0_0_1px_rgba(255,255,255,.25)_inset]">
        <div className="mx-auto w-full max-w-[1280px]">{children}</div>
      </main>
    </div>
  );
}
