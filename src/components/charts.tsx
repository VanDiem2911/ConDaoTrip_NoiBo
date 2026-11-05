"use client";

import { useState } from "react";
import { compactVnd, fmtVnd } from "@/lib/money";

import { CHART } from "@/lib/chart-colors";

export interface BarSeries { key: string; name: string; color: string }
export interface BarDatum { label: string; title?: string; values: Record<string, number> }

function niceMax(v: number) {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * pow;
}

/** Cột nhóm theo tháng: hover/focus hiện tooltip, có bảng dữ liệu thay thế cho trình đọc màn hình */
export function BarChart({ data, series, height = 240, title }: { data: BarDatum[]; series: BarSeries[]; height?: number; title: string }) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...data.flatMap((d) => series.map((s) => d.values[s.key] ?? 0))));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => max * t);
  const single = series.length === 1;

  return (
    <figure aria-label={title} className="w-full">
      {!single && (
        <figcaption className="mb-5 flex flex-wrap gap-x-5 gap-y-1">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2">
              <span aria-hidden className="size-2.5 rounded-sm" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </figcaption>
      )}
      <div className="flex gap-3 pt-2" style={{ height: height + 8 }}>
        <div className="relative w-12 shrink-0 text-right text-xs text-ink-3" aria-hidden>
          {ticks.map((t, i) => (
            <span key={i} className="absolute right-0 -translate-y-1/2" style={{ bottom: `calc(${(i / 4) * 100}% * (1 - 28 / ${height}) + 28px)` }}>
              {t === 0 ? "0" : compactVnd(t)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="absolute inset-x-0 bottom-7 top-0" aria-hidden>
            {ticks.map((_, i) => (
              <div key={i} className="absolute inset-x-0 border-t border-dashed border-line" style={{ bottom: `${(i / 4) * 100}%` }} />
            ))}
          </div>
          <div className="relative flex h-full items-stretch justify-around gap-1">
            {data.map((d, i) => {
              const tip = active === i;
              return (
                <div
                  key={d.label}
                  tabIndex={0}
                  role="group"
                  aria-label={`${d.title ?? d.label}: ${series.map((s) => `${s.name} ${fmtVnd(d.values[s.key] ?? 0)}`).join(", ")}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="relative flex min-w-0 flex-1 flex-col items-center rounded-lg outline-offset-2"
                >
                  <div className="flex w-full flex-1 items-end justify-center gap-[3px] pb-0 pt-2">
                    {series.map((s, si) => {
                      const v = d.values[s.key] ?? 0;
                      const h = Math.max(v > 0 ? 3 : 0, (Math.max(0, v) / max) * 100);
                      return (
                        <div
                          key={s.key}
                          className="bar-grow w-full max-w-[44px] rounded-t-[6px] transition-[filter,opacity] duration-150"
                          style={{
                            height: `${h}%`,
                            background: s.color,
                            animationDelay: `${i * 50 + si * 30}ms`,
                            opacity: active === null || tip ? 1 : 0.45,
                          }}
                        />
                      );
                    })}
                  </div>
                  <span className="mt-2 h-5 text-[13px] font-semibold text-ink-2">{d.label}</span>
                  {tip && (
                    <div role="tooltip" className="anim-pop pointer-events-none absolute -top-1 left-1/2 z-10 w-max min-w-36 -translate-x-1/2 -translate-y-full rounded-xl bg-brand-900 px-3 py-2 text-xs text-white shadow-[var(--shadow-pop)]">
                      <p className="mb-1 font-bold">{d.title ?? d.label}</p>
                      {series.map((s) => (
                        <p key={s.key} className="flex items-center justify-between gap-4">
                          <span className="inline-flex items-center gap-1.5"><span aria-hidden className="size-2 rounded-sm" style={{ background: s.color }} />{s.name}</span>
                          <b>{fmtVnd(d.values[s.key] ?? 0)}</b>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <details className="mt-3 text-sm">
        <summary className="inline-block rounded-lg px-1 text-[13px] font-semibold text-brand-700 hover:underline">Xem dạng bảng</summary>
        <div className="table-wrap mt-2">
          <table className="tbl">
            <thead>
              <tr><th>Kỳ</th>{series.map((s) => <th key={s.key} className="num">{s.name}</th>)}</tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.label}><td>{d.title ?? d.label}</td>{series.map((s) => <td key={s.key} className="num">{fmtVnd(d.values[s.key] ?? 0)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

export interface Slice { key: string; name: string; value: number; color: string; sub?: string }

/** Biểu đồ vành: tỷ trọng doanh thu; luôn kèm danh sách giá trị + % (không chỉ dùng màu) */
export function Donut({ slices, centerLabel, title }: { slices: Slice[]; centerLabel: string; title: string }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const R = 52, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <figure aria-label={title} className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 140 140" className="size-36 shrink-0 -rotate-90" role="img" aria-label={title}>
        <circle cx="70" cy="70" r={R} fill="none" stroke="#e6f5ec" strokeWidth="18" />
        {total > 0 &&
          slices.map((s) => {
            const len = (s.value / total) * C;
            const el = (
              <circle key={s.key} cx="70" cy="70" r={R} fill="none" stroke={s.color} strokeWidth="18"
                strokeDasharray={`${Math.max(0, len - 2)} ${C - Math.max(0, len - 2)}`} strokeDashoffset={-acc} strokeLinecap="butt">
                <title>{`${s.name}: ${fmtVnd(s.value)}`}</title>
              </circle>
            );
            acc += len;
            return el;
          })}
        <text x="70" y="70" textAnchor="middle" dominantBaseline="central" className="rotate-90 fill-ink" style={{ transformOrigin: "70px 70px", fontSize: 15, fontWeight: 800 }}>
          {centerLabel}
        </text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-3">
        {slices.map((s) => (
          <li key={s.key} className="flex items-start gap-2.5">
            <span aria-hidden className="mt-1.5 size-3 shrink-0 rounded-sm" style={{ background: s.color }} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">{s.name} <span className="font-medium text-ink-3">· {total ? Math.round((s.value / total) * 100) : 0}%</span></p>
              <p className="text-[13px] text-ink-2">{fmtVnd(s.value)}{s.sub ? ` · ${s.sub}` : ""}</p>
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/** Thanh ngang xếp hạng (top tour, top sale...) */
export function HBars({ rows, color = CHART.green, format = fmtVnd }: { rows: { label: string; value: number; sub?: string }[]; color?: string; format?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium text-ink">{r.label}</span>
            <span className="shrink-0 font-semibold text-ink-2">{format(r.value)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-brand-100">
            <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: color }} />
          </div>
          {r.sub && <p className="mt-0.5 text-xs text-ink-3">{r.sub}</p>}
        </li>
      ))}
    </ul>
  );
}
