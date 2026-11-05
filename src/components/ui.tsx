import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Loader2 } from "lucide-react";

export const cn = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

/* ---------- Card ---------- */
export function Card({ className, children, ...p }: ComponentProps<"section">) {
  return (
    <section className={cn("glass rounded-3xl", className)} {...p}>
      {children}
    </section>
  );
}

export function CardHeader({ title, sub, action, className }: { title: ReactNode; sub?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6", className)}>
      <div className="min-w-0">
        <h2 className="text-[17px] font-bold leading-tight tracking-tight text-ink">{title}</h2>
        {sub && <p className="mt-1 text-sm text-ink-3">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, sub, action }: { title: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {sub && <p className="mt-1 max-w-2xl text-sm text-ink-3">{sub}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

/* ---------- Badge ---------- */
export type Tone = "green" | "amber" | "red" | "sea" | "gold" | "slate";
const TONES: Record<Tone, string> = {
  green: "bg-brand-100 text-brand-700 ring-brand-200",
  amber: "bg-[#fdf1d6] text-[#7a4f00] ring-[#f1dba3]",
  red: "bg-[#fde8e8] text-[#b42318] ring-[#f8c9c9]",
  sea: "bg-sea-50 text-sea-700 ring-[#bfe0e8]",
  gold: "bg-gold-100 text-[#6b5a2f] ring-gold-200",
  slate: "bg-[#eef2f0] text-ink-2 ring-line",
};
export function Badge({ tone = "slate", children, icon, className }: { tone?: Tone; children: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", TONES[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

/* ---------- Button ---------- */
type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "gold";
type BtnSize = "sm" | "md" | "lg";
const BTN: Record<BtnVariant, string> = {
  primary: "bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-[0_6px_16px_-6px_rgba(14,122,57,.7)] hover:from-brand-600 hover:to-brand-700",
  secondary: "bg-white/80 text-ink ring-1 ring-inset ring-line hover:bg-white hover:ring-brand-300",
  ghost: "text-ink-2 hover:bg-brand-100/70",
  danger: "bg-[#fde8e8] text-[#b42318] ring-1 ring-inset ring-[#f8c9c9] hover:bg-[#fbd5d5]",
  gold: "bg-gold-100 text-[#5f4f27] ring-1 ring-inset ring-gold-200 hover:bg-gold-200",
};
const BTN_SIZE: Record<BtnSize, string> = {
  sm: "h-9 px-3 text-[13px] gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-[15px] gap-2",
};
export const btnClass = (variant: BtnVariant = "primary", size: BtnSize = "md", extra?: string) =>
  cn("inline-flex select-none items-center justify-center rounded-xl font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]", BTN[variant], BTN_SIZE[size], extra);

export function Button({
  variant = "primary", size = "md", loading, className, children, disabled, ...p
}: ComponentProps<"button"> & { variant?: BtnVariant; size?: BtnSize; loading?: boolean }) {
  return (
    <button type="button" className={btnClass(variant, size, className)} disabled={disabled || loading} {...p}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({
  variant = "primary", size = "md", className, href, children, ...p
}: Omit<ComponentProps<typeof Link>, "href"> & { href: string; variant?: BtnVariant; size?: BtnSize }) {
  return (
    <Link href={href} className={btnClass(variant, size, className)} {...p}>
      {children}
    </Link>
  );
}

/* ---------- Form ---------- */
export const inputClass =
  "w-full h-11 rounded-xl bg-white/90 px-3.5 text-[15px] text-ink ring-1 ring-inset ring-line placeholder:text-ink-3/70 transition-shadow focus:ring-2 focus:ring-brand-500 disabled:bg-brand-50 disabled:text-ink-3";

export function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
      {error && <span role="alert" className="mt-1 block text-xs font-medium text-[#b42318]">{error}</span>}
    </label>
  );
}
export function Input({ className, ...p }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...p} />;
}
export function Select({ className, children, ...p }: ComponentProps<"select">) {
  return (
    <select className={cn(inputClass, "pr-8", className)} {...p}>
      {children}
    </select>
  );
}
export function Textarea({ className, ...p }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClass, "h-auto min-h-24 py-2.5", className)} {...p} />;
}

/* ---------- Stat tile (KPI) ---------- */
const STAT_TONE: Record<string, string> = {
  green: "bg-brand-100 text-brand-600",
  sea: "bg-sea-50 text-sea-700",
  gold: "bg-gold-100 text-gold-700",
  red: "bg-[#fde8e8] text-[#b42318]",
  violet: "bg-[#ece8f8] text-[#5b3fa8]",
};
export function Stat({ icon, label, value, sub, tone = "green", delay = 0 }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode; tone?: keyof typeof STAT_TONE; delay?: number }) {
  return (
    <div className="glass anim-up flex items-center gap-4 rounded-3xl p-4 sm:p-5" style={{ animationDelay: `${delay}ms` }}>
      <div className={cn("grid size-14 shrink-0 place-items-center rounded-2xl", STAT_TONE[tone])}>{icon}</div>
      <div className="min-w-0">
        <div className="truncate text-[26px] font-extrabold leading-none tracking-tight text-ink">{value}</div>
        <div className="mt-1.5 truncate text-sm text-ink-2">{label}</div>
        {sub && <div className="mt-0.5 truncate text-xs text-ink-3">{sub}</div>}
      </div>
    </div>
  );
}

/* ---------- Progress ---------- */
export function Progress({ value, max, label, tone = "green" }: { value: number; max: number; label?: string; tone?: "green" | "gold" }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="min-w-[96px]" role="progressbar" aria-valuenow={value} aria-valuemax={max} aria-label={label ?? "Tiến độ"}>
      <div className="h-2 overflow-hidden rounded-full bg-brand-100">
        <div className={cn("h-full rounded-full transition-[width] duration-500", tone === "gold" ? "bg-gold-500" : "bg-brand-500")} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 text-xs text-ink-3">{label ?? `${value}/${max}`}</div>
    </div>
  );
}

export function Empty({ icon, title, sub, action }: { icon?: ReactNode; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      {icon && <div className="grid size-14 place-items-center rounded-2xl bg-brand-100 text-brand-600">{icon}</div>}
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {sub && <p className="max-w-sm text-sm text-ink-3">{sub}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]).join("").toUpperCase();
  return (
    <span aria-hidden className={cn("grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-800 text-[13px] font-bold text-white", className)}>
      {initials || "?"}
    </span>
  );
}

/* Hình bìa tour: ảnh thật, hoặc khối gradient nếu chưa có */
export function Cover({ src, alt = "", className, w = 800, priority }: { src?: string; alt?: string; className?: string; w?: number; priority?: boolean }) {
  if (!src) {
    return <div aria-hidden className={cn("bg-gradient-to-br from-brand-300 via-brand-500 to-sea-700", className)} />;
  }
  // Ảnh Cloudinary: xin đúng độ rộng cần hiển thị (thumbnail 44–56px chỉ cần ~128px, không tải bản 800px)
  const url = src.replace(/(\/image\/upload\/[^/]*?)w_\d+/, `$1w_${w}`);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} decoding="async" className={cn("object-cover", className)} />;
}
