"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BriefcaseBusiness, Eye, EyeOff, Lock, Mail, Phone, Route as RouteIcon, UserRound, Wallet, CircleAlert } from "lucide-react";
import { Button, Field, Input, Select, cn } from "@/components/ui";
import { http } from "@/components/hooks";

const DEMO = [
  { label: "Điều hành", note: "Xếp dịch vụ, nhà cung cấp", email: "dieuhanh@condaotrip.demo", icon: RouteIcon },
  { label: "Kế toán", note: "Thu chi, công nợ", email: "ketoan@condaotrip.demo", icon: Wallet },
  { label: "Sale", note: "Báo giá, hoa hồng", email: "sale.bao@condaotrip.demo", icon: BriefcaseBusiness },
  { label: "Khách / Đối tác", note: "Chọn dịch vụ, xem giá", email: "doitac@condaotrip.demo", icon: UserRound },
];

export function LoginForm({ showDemo }: { showDemo: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [f, setF] = useState({ name: "", email: "", password: "", phone: "", kind: "individual" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const errId = useId();
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await http("POST", mode === "login" ? "/api/auth/login" : "/api/auth/register", f);
      router.replace("/");
      router.refresh();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Có lỗi xảy ra");
      setBusy(false);
    }
  }

  return (
    <div className="anim-up relative w-full overflow-hidden rounded-[28px] bg-[#fbf9f4] p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] ring-1 ring-white/40 sm:p-8">
      <div className="mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo_green.svg" alt="ConDaoTrip" width={140} height={45} className="h-11 w-auto" />
      </div>

      <div role="tablist" aria-label="Đăng nhập hoặc đăng ký" className="mb-6 grid grid-cols-2 rounded-2xl bg-brand-100/80 p-1">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => { setMode(m); setErr(""); }}
            className={cn("h-11 rounded-xl text-sm font-semibold transition-all duration-200", mode === m ? "bg-white text-brand-700 shadow-sm" : "text-ink-2 hover:text-ink")}
          >
            {m === "login" ? "Đăng nhập" : "Đăng ký khách hàng"}
          </button>
        ))}
      </div>

      <h2 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink">{mode === "login" ? "Chào mừng trở lại" : "Tạo tài khoản đối tác"}</h2>
      <p className="mb-5 mt-1 text-sm text-ink-3">
        {mode === "login" ? "Đăng nhập để tiếp tục làm việc." : "Chọn dịch vụ, xem báo giá và gửi yêu cầu đặt trực tiếp."}
      </p>

      <form onSubmit={submit} className="space-y-4" noValidate aria-describedby={err ? errId : undefined}>
        {mode === "register" && (
          <div className="space-y-4">
            <Field label="Họ tên / Tên công ty">
              <Input value={f.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Loại khách">
                <Select value={f.kind} onChange={(e) => set("kind", e.target.value)}>
                  <option value="individual">Khách lẻ</option>
                  <option value="agent">Đại lý / Đối tác</option>
                </Select>
              </Field>
              <Field label="Số điện thoại">
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-3" aria-hidden />
                  <Input className="pl-11" value={f.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" autoComplete="tel" />
                </div>
              </Field>
            </div>
          </div>
        )}

        <Field label="Email">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-3" aria-hidden />
            <Input className="pl-11" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" placeholder="ten@congty.vn" required />
          </div>
        </Field>

        <Field label="Mật khẩu" hint={mode === "register" ? "Tối thiểu 8 ký tự" : undefined}>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-3" aria-hidden />
            <Input className="pl-11 pr-12" type={show ? "text" : "password"} value={f.password} onChange={(e) => set("password", e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} required />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              aria-pressed={show}
              className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-brand-100 hover:text-ink"
            >
              {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
            </button>
          </div>
        </Field>

        {err && (
          <p id={errId} role="alert" className="anim-pop flex items-start gap-2 rounded-xl bg-[#fde8e8] px-3.5 py-2.5 text-sm font-medium text-[#b42318]">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {err}
          </p>
        )}

        <Button type="submit" size="lg" className="group w-full" loading={busy}>
          {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
          {!busy && <ArrowRight className="size-5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />}
        </Button>
      </form>

      {showDemo && mode === "login" && (
        <div className="mt-6 border-t border-line pt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-3">
            Dùng thử nhanh <span className="font-medium normal-case tracking-normal">· bấm để điền (mật khẩu ConDao@2026)</span>
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {DEMO.map((d) => {
              const on = f.email === d.email;
              return (
                <button
                  key={d.email}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setF((s) => ({ ...s, email: d.email, password: "ConDao@2026" }))}
                  className={cn(
                    "flex min-h-[60px] items-center gap-2.5 rounded-2xl p-2.5 text-left ring-1 ring-inset transition-all duration-200",
                    on ? "bg-brand-100 ring-brand-500" : "bg-white ring-line hover:bg-brand-50 hover:ring-brand-300",
                  )}
                >
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl transition-colors", on ? "bg-brand-600 text-white" : "bg-brand-100 text-brand-600")}>
                    <d.icon className="size-[18px]" strokeWidth={1.9} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-bold text-ink">{d.label}</span>
                    <span className="block truncate text-[11.5px] text-ink-3">{d.note}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
