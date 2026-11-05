"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HandCoins } from "lucide-react";
import { http, useAction } from "@/components/hooks";
import { Modal } from "@/components/modal";
import { Avatar, Badge, Button, Card, CardHeader, Empty, Field, Input, Select, cn } from "@/components/ui";
import { compactVnd, fmtDate, fmtVnd, todayIso } from "@/lib/money";
import type { FinanceRow } from "@/lib/data";

interface Sum { id: string; name: string; rate: number; bookings: number; revenue: number; profit: number; commission: number; paid: number; remaining: number }

export function CommissionBoard({ summary, rows, canPay, showProfit }: { summary: Sum[]; rows: FinanceRow[]; canPay: boolean; showProfit: boolean }) {
  const { run, pending } = useAction();
  const [sale, setSale] = useState("all");
  const [kind, setKind] = useState<"all" | "package" | "retail">("all");
  const [pay, setPay] = useState<Sum | null>(null);
  const [f, setF] = useState({ amountVnd: 0, date: todayIso(), method: "Chuyển khoản", note: "" });

  const shown = useMemo(() => rows.filter((r) => (sale === "all" || r.saleId === sale) && (kind === "all" || r.kind === kind)), [rows, sale, kind]);
  const total = shown.reduce((s, r) => s + r.commission, 0);

  async function submit() {
    if (!pay) return;
    const r = await run(() => http("POST", "/api/transactions", { type: "chi", kind: "commission", userId: pay.id, ...f }), "Đã ghi chi hoa hồng");
    if (r) setPay(null);
  }
  const chip = (on: boolean) => cn("h-9 rounded-full px-3.5 text-[13px] font-semibold ring-1 ring-inset transition-colors", on ? "bg-brand-900 text-white ring-brand-900" : "bg-white/70 text-ink-2 ring-line hover:bg-brand-100");

  return (
    <>
      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summary.map((s, i) => (
          <Card key={s.id} className="anim-up p-5" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center gap-3">
              <Avatar name={s.name} className="size-11" />
              <div className="min-w-0 flex-1"><p className="truncate font-bold text-ink">{s.name}</p><p className="text-xs text-ink-3">Hoa hồng {s.rate}% lợi nhuận · {s.bookings} đơn</p></div>
              <button type="button" onClick={() => setSale(sale === s.id ? "all" : s.id)} aria-pressed={sale === s.id} className={chip(sale === s.id)}>Lọc</button>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-white/70 p-2.5 ring-1 ring-inset ring-line"><dt className="text-[11px] text-ink-3">Tổng hoa hồng</dt><dd className="font-extrabold text-brand-700">{compactVnd(s.commission)}</dd></div>
              <div className="rounded-2xl bg-white/70 p-2.5 ring-1 ring-inset ring-line"><dt className="text-[11px] text-ink-3">Đã chi</dt><dd className="font-bold">{compactVnd(s.paid)}</dd></div>
              <div className="rounded-2xl bg-gold-100 p-2.5 ring-1 ring-inset ring-gold-200"><dt className="text-[11px] text-[#6b5a2f]">Còn phải chi</dt><dd className="font-extrabold text-[#5f4f27]">{compactVnd(s.remaining)}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-ink-3">Doanh thu {fmtVnd(s.revenue)}{showProfit ? ` · Lợi nhuận ${fmtVnd(s.profit)}` : ""}</p>
            {canPay && <Button className="mt-3 w-full" variant="secondary" disabled={s.remaining <= 0} onClick={() => { setPay(s); setF({ ...f, amountVnd: s.remaining }); }}><HandCoins className="size-4" aria-hidden /> Chi hoa hồng</Button>}
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Hoa hồng theo từng đơn" sub={`${shown.length} đơn · tổng ${fmtVnd(total)}`} />
        <div className="flex flex-wrap gap-2 px-5 pb-3 pt-4 sm:px-6" role="group" aria-label="Loại đơn">
          {([["all", "Tất cả"], ["package", "Tour trọn gói"], ["retail", "Dịch vụ lẻ"]] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={chip(kind === k)}>{l}</button>)}
          {sale !== "all" && <button type="button" onClick={() => setSale("all")} className={chip(false)}>Bỏ lọc sale ✕</button>}
        </div>
        {shown.length === 0 ? <Empty title="Chưa có đơn phù hợp" /> : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Đơn</th><th>Loại</th><th>Sale</th><th>Ngày đi</th><th className="num">Doanh thu</th>{showProfit && <th className="num">Lợi nhuận</th>}<th className="num">%</th><th className="num">Hoa hồng</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id}>
                    <td><Link href={`/bookings/${r.id}`} className="font-semibold text-ink hover:text-brand-700 hover:underline">{r.groupName}</Link><p className="text-xs text-ink-3">{r.code}</p></td>
                    <td><Badge tone={r.kind === "package" ? "gold" : "sea"}>{r.kind === "package" ? "Trọn gói" : "Dịch vụ lẻ"}</Badge></td>
                    <td className="whitespace-nowrap">{r.saleName ?? "—"}</td>
                    <td className="whitespace-nowrap">{fmtDate(r.travelDate)}</td>
                    <td className="num">{fmtVnd(r.sell)}</td>
                    {showProfit && <td className="num">{fmtVnd(r.profit)}</td>}
                    <td className="num">{r.rate}%</td>
                    <td className="num font-bold text-brand-700">{fmtVnd(r.commission)}</td>
                    <td>{r.commissionPaid >= r.commission && r.commission > 0 ? <Badge tone="green">Đã chi</Badge> : r.complete ? <Badge tone="amber">Chờ chi</Badge> : <Badge tone="slate">Tạm tính</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!pay} onClose={() => setPay(null)} title="Chi hoa hồng" sub={pay ? `${pay.name} · còn phải chi ${fmtVnd(pay.remaining)}` : undefined}
        footer={<><Button variant="secondary" onClick={() => setPay(null)}>Huỷ</Button><Button loading={pending} disabled={f.amountVnd <= 0} onClick={submit}>Ghi chi</Button></>}>
        <div className="space-y-4">
          <Field label="Số tiền (VND)"><Input type="number" min={0} step={10000} inputMode="numeric" value={f.amountVnd} onChange={(e) => setF({ ...f, amountVnd: Number(e.target.value) })} className="font-bold" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ngày chi"><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
            <Field label="Hình thức"><Select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}><option>Chuyển khoản</option><option>Tiền mặt</option></Select></Field>
          </div>
          <Field label="Ghi chú"><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="VD: Hoa hồng tháng 10" /></Field>
        </div>
      </Modal>
    </>
  );
}
