"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CircleCheck, ClipboardList, Pencil, Search, Wrench } from "lucide-react";
import { ArrangeModal, type ArrangeTarget, type SupplierOpt } from "@/components/arrange-modal";
import { CategoryGlyph } from "@/components/nav-icon";
import { Badge, Button, Card, Cover, Empty, Input, Progress, cn } from "@/components/ui";
import { daysLabel } from "@/lib/ui-format";
import { fmtDate, fmtVnd } from "@/lib/money";
import { SERVICE_CATEGORIES, type Booking } from "@/lib/types";
import type { S } from "@/lib/data";

type Kind = "all" | "package" | "retail";

export function OperationsBoard({ bookings, suppliers }: { bookings: S<Booking>[]; suppliers: SupplierOpt[] }) {
  const [kind, setKind] = useState<Kind>("all");
  const [onlyPending, setOnlyPending] = useState(true);
  const [q, setQ] = useState("");
  const [target, setTarget] = useState<ArrangeTarget | null>(null);
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

  const stats = useMemo(() => {
    const pend = (k: "package" | "retail") =>
      bookings.reduce((s, b) => s + b.lines.filter((l) => l.status === "pending" && l.origin === k).length, 0);
    return { package: pend("package"), retail: pend("retail"), bookings: bookings.filter((b) => b.lines.some((l) => l.status === "pending")).length };
  }, [bookings]);

  const rows = useMemo(
    () =>
      bookings
        .filter((b) => (kind === "all" || b.kind === kind || b.lines.some((l) => l.origin === kind)))
        .filter((b) => !q || norm(`${b.groupName} ${b.code} ${b.customerName} ${b.title}`).includes(norm(q)))
        .filter((b) => !onlyPending || b.lines.some((l) => l.status === "pending")),
    [bookings, kind, onlyPending, q], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Cập nhật target từ dữ liệu mới nhất sau refresh
  const live = target
    ? (() => {
        const b = bookings.find((x) => x.id === target.bookingId);
        const l = b?.lines.find((x) => x.id === target.line.id);
        return l ? { ...target, line: l } : null;
      })()
    : null;

  return (
    <>
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <div className="glass rounded-3xl p-5"><p className="text-sm text-ink-3">Booking cần xếp</p><p className="mt-1 text-3xl font-extrabold text-ink">{stats.bookings}</p></div>
        <div className="glass rounded-3xl p-5"><p className="text-sm text-ink-3">Dịch vụ chờ xếp · <b className="text-[#6b5a2f]">Tour trọn gói</b></p><p className="mt-1 text-3xl font-extrabold text-ink">{stats.package}</p></div>
        <div className="glass rounded-3xl p-5"><p className="text-sm text-ink-3">Dịch vụ chờ xếp · <b className="text-sea-700">Dịch vụ lẻ</b></p><p className="mt-1 text-3xl font-extrabold text-ink">{stats.retail}</p></div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <Input className="pl-10" placeholder="Tìm đoàn, mã booking…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Tìm booking" />
        </div>
        <div role="group" aria-label="Lọc loại" className="flex flex-wrap gap-2">
          {([["all", "Tất cả"], ["package", "Tour trọn gói"], ["retail", "Dịch vụ lẻ"]] as const).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={cn("h-9 rounded-full px-3.5 text-[13px] font-semibold ring-1 ring-inset transition-colors", kind === k ? "bg-brand-900 text-white ring-brand-900" : "bg-white/70 text-ink-2 ring-line hover:bg-brand-100")}>{l}</button>
          ))}
        </div>
        <label className="inline-flex min-h-11 items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" className="size-5 accent-brand-600" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} /> Chỉ đơn còn việc
        </label>
      </div>

      {rows.length === 0 ? (
        <Card><Empty icon={<CircleCheck className="size-7" />} title="Không còn dịch vụ nào cần xếp" sub="Tất cả booking đã được xếp đủ, hoặc không có kết quả khớp bộ lọc." /></Card>
      ) : (
        <div className="space-y-5">
          {rows.map((b) => {
            const done = b.lines.filter((l) => l.status === "arranged").length;
            const lines = b.lines.filter((l) => kind === "all" || l.origin === kind);
            return (
              <Card key={b.id} className="anim-up overflow-hidden">
                <div className="flex flex-wrap items-center gap-4 border-b border-line/70 p-4 sm:px-6">
                  <Cover src={b.cover} w={128} className="size-14 shrink-0 rounded-2xl" />
                  <div className="min-w-0 flex-1 basis-60">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/bookings/${b.id}`} className="text-[16px] font-bold text-ink hover:text-brand-700 hover:underline">{b.groupName}</Link>
                      <Badge tone={b.kind === "package" ? "gold" : "sea"}>{b.kind === "package" ? "Tour trọn gói" : "Dịch vụ lẻ"}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-ink-3">{b.code} · {b.customerName} · {b.adults + b.children + b.infants} khách · đi <b className="text-ink-2">{fmtDate(b.travelDate)}</b> <span className="text-ink-3">({daysLabel(b.travelDate)})</span></p>
                  </div>
                  <Progress value={done} max={b.lines.length} label={done === b.lines.length ? "Đã xếp đủ" : `Đã xếp ${done}/${b.lines.length}`} tone={done === b.lines.length ? "green" : "gold"} />
                </div>
                <div className="table-wrap">
                  <table className="tbl">
                    <thead><tr><th>Dịch vụ</th><th>Nguồn</th><th className="num">SL</th><th>Trạng thái</th><th>NCC / thông tin đã xếp</th><th className="num">Giá vốn</th><th className="num">Xếp</th></tr></thead>
                    <tbody>
                      {lines.map((l) => (
                        <tr key={l.id} className={cn(l.status === "pending" && "bg-gold-50/60")}>
                          <td>
                            <div className="flex min-w-[170px] items-center gap-3">
                              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-600"><CategoryGlyph category={l.category} className="size-[18px]" /></span>
                              <div className="min-w-0"><p className="font-semibold text-ink">{l.name}</p><p className="text-xs text-ink-3">{SERVICE_CATEGORIES[l.category] ?? l.category}</p></div>
                            </div>
                          </td>
                          <td>
                            {l.origin === "package"
                              ? <div><Badge tone="gold">Trọn gói</Badge><p className="mt-0.5 max-w-[110px] truncate text-xs text-ink-3" title={l.tourName}>{l.tourName}</p></div>
                              : <Badge tone="sea">Dịch vụ lẻ</Badge>}
                          </td>
                          <td className="num">{l.qty} <span className="text-xs text-ink-3">{l.unit}</span></td>
                          <td>{l.status === "arranged" ? <Badge tone="green" icon={<CircleCheck className="size-3.5" aria-hidden />}>Đã xếp</Badge> : <Badge tone="amber" icon={<ClipboardList className="size-3.5" aria-hidden />}>Chờ xếp</Badge>}</td>
                          <td className="max-w-[210px]">
                            {l.status === "arranged" ? (<><p className="truncate font-medium text-ink" title={l.supplierName}>{l.supplierName ?? "Tự thực hiện"}</p><p className="truncate text-xs text-ink-3" title={l.arrangeInfo}>{l.arrangeInfo || "—"}</p></>) : <span className="text-ink-3">—</span>}
                          </td>
                          <td className="num font-semibold">{l.status === "arranged" ? fmtVnd(l.costVnd ?? 0) : "—"}</td>
                          <td className="num">
                            <Button size="sm" variant={l.status === "pending" ? "primary" : "secondary"} onClick={() => setTarget({ bookingId: b.id, bookingCode: b.code, groupName: b.groupName, line: l })} aria-label={`${l.status === "pending" ? "Xếp" : "Sửa"} ${l.name}`}>
                              {l.status === "pending" ? <><Wrench className="size-4" aria-hidden /> Xếp</> : <><Pencil className="size-4" aria-hidden /> Sửa</>}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <ArrangeModal target={live} suppliers={suppliers} onClose={() => setTarget(null)} />
    </>
  );
}
