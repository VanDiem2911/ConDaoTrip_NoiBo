"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CircleCheck, TriangleAlert, Wallet } from "lucide-react";
import { http, useAction } from "@/components/hooks";
import { Modal } from "@/components/modal";
import { PaySupplierModal, type PayTarget } from "@/components/pay-supplier-modal";
import { Badge, Button, Card, Empty, Field, Input, Select, Stat, cn } from "@/components/ui";
import { compactVnd, fmtDate, fmtVnd, todayIso } from "@/lib/money";
import type { FinanceRow } from "@/lib/data";

interface Sup { id: string; name: string; phone?: string; cost: number; paid: number; owed: number; lastPaid?: string }

export function DebtBoard({ rows, suppliers }: { rows: FinanceRow[]; suppliers: Sup[] }) {
  const { run, pending } = useAction();
  const [tab, setTab] = useState<"customer" | "supplier">("customer");
  const [filter, setFilter] = useState<"owed" | "overdue" | "all">("owed");
  const [paySup, setPaySup] = useState<PayTarget | null>(null);
  const [payRow, setPayRow] = useState<FinanceRow | null>(null);
  const [f, setF] = useState({ kind: "payment", amountVnd: 0, date: todayIso(), method: "Chuyển khoản", note: "" });

  const owedRows = rows.filter((r) => r.owed > 0);
  const totalOwed = owedRows.reduce((s, r) => s + r.owed, 0);
  const overdue = owedRows.filter((r) => r.overdue);
  const supOwed = suppliers.reduce((s, x) => s + x.owed, 0);

  const shown = useMemo(
    () => rows.filter((r) => (filter === "all" ? true : filter === "owed" ? r.owed > 0 : r.overdue)).sort((a, b) => (a.owed > 0 && b.owed > 0 ? a.daysToTravel - b.daysToTravel : b.owed - a.owed)),
    [rows, filter],
  );
  // Khách nào còn nợ: gom công nợ theo từng khách / đối tác
  const byCustomer = useMemo(() => {
    const m = new Map<string, { name: string; owed: number; orders: number; overdue: number; paid: number; sell: number }>();
    for (const r of rows) {
      if (r.owed <= 0) continue;
      const e = m.get(r.customerName) ?? { name: r.customerName, owed: 0, orders: 0, overdue: 0, paid: 0, sell: 0 };
      e.owed += r.owed; e.orders += 1; e.paid += r.paid; e.sell += r.sell; e.overdue += r.overdue ? 1 : 0;
      m.set(r.customerName, e);
    }
    return Array.from(m.values()).sort((a, b) => b.owed - a.owed);
  }, [rows]);
  const shownSup = suppliers.filter((s) => s.cost > 0 || s.owed > 0).sort((a, b) => b.owed - a.owed);

  async function submit() {
    if (!payRow) return;
    const r = await run(() => http("POST", `/api/bookings/${payRow.id}/payments`, f), "Đã ghi nhận thanh toán");
    if (r) setPayRow(null);
  }
  const chip = (on: boolean) => cn("h-9 rounded-full px-3.5 text-[13px] font-semibold ring-1 ring-inset transition-colors", on ? "bg-brand-900 text-white ring-brand-900" : "bg-white/70 text-ink-2 ring-line hover:bg-brand-100");

  return (
    <>
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Stat tone="red" icon={<Wallet className="size-7" strokeWidth={1.7} aria-hidden />} value={compactVnd(totalOwed)} label="Khách còn nợ" sub={`${owedRows.length} đơn · ${fmtVnd(totalOwed)}`} />
        <Stat tone="gold" icon={<TriangleAlert className="size-7" strokeWidth={1.7} aria-hidden />} value={overdue.length} label="Đơn cần nhắc" sub="Đi trong 7 ngày hoặc đã qua ngày đi" delay={60} />
        <Stat tone="sea" icon={<Wallet className="size-7" strokeWidth={1.7} aria-hidden />} value={compactVnd(supOwed)} label="Còn phải trả NCC" sub={`${suppliers.filter((s) => s.owed > 0).length} nhà cung cấp`} delay={120} />
      </div>

      <div role="tablist" aria-label="Loại công nợ" className="mb-4 inline-flex rounded-2xl bg-white/70 p-1 ring-1 ring-inset ring-line">
        {([["customer", "Phải thu khách hàng"], ["supplier", "Phải trả nhà cung cấp"]] as const).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("h-10 rounded-xl px-4 text-sm font-semibold transition-all", tab === k ? "bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow" : "text-ink-2 hover:bg-brand-100")}>{l}</button>
        ))}
      </div>

      {tab === "customer" && byCustomer.length > 0 && (
        <div className="mb-5">
          <h2 className="mb-3 text-[15px] font-bold text-ink">Khách / đối tác đang nợ</h2>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {byCustomer.map((c) => (
              <li key={c.name} className={cn("glass rounded-2xl p-4", c.overdue > 0 && "border-[#f8c9c9]")}>
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 font-semibold text-ink">{c.name}</p>
                  {c.overdue > 0 && <Badge tone="red" icon={<TriangleAlert className="size-3.5" aria-hidden />}>{c.overdue} đơn cần nhắc</Badge>}
                </div>
                <p className="mt-1 text-xl font-extrabold text-[#b42318]">{fmtVnd(c.owed)}</p>
                <p className="text-xs text-ink-3">{c.orders} đơn · đã thu {fmtVnd(c.paid)} / {fmtVnd(c.sell)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "customer" ? (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap gap-2 p-4 sm:p-5" role="group" aria-label="Lọc công nợ">
            {([["owed", `Còn nợ (${owedRows.length})`], ["overdue", `Cần nhắc (${overdue.length})`], ["all", "Tất cả đơn"]] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} className={chip(filter === k)}>{l}</button>)}
          </div>
          {shown.length === 0 ? <Empty icon={<CircleCheck className="size-7" />} title="Không có công nợ cần theo dõi" /> : (
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Đơn / khách</th><th>Ngày đi</th><th className="num">Giá trị</th><th className="num">Đặt cọc</th><th className="num">Tạm ứng</th><th className="num">Đã thu</th><th className="num">Còn nợ</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.id} className={cn(r.overdue && "bg-[#fff6f6]")}>
                      <td><Link href={`/bookings/${r.id}`} className="font-semibold text-ink hover:text-brand-700 hover:underline">{r.groupName}</Link><p className="text-xs text-ink-3">{r.code} · {r.customerName}{r.saleName ? ` · Sale ${r.saleName}` : ""}</p></td>
                      <td className="whitespace-nowrap">{fmtDate(r.travelDate)}<p className="text-xs text-ink-3">{r.daysToTravel < 0 ? `đã đi ${-r.daysToTravel} ngày` : r.daysToTravel === 0 ? "hôm nay" : `còn ${r.daysToTravel} ngày`}</p></td>
                      <td className="num">{fmtVnd(r.sell)}</td>
                      <td className="num">{fmtVnd(r.deposit)}</td>
                      <td className="num">{fmtVnd(r.advance)}</td>
                      <td className="num">{fmtVnd(r.paid)}</td>
                      <td className="num">{r.owed > 0 ? <b className="text-[#b42318]">{fmtVnd(r.owed)}</b> : <span className="text-ink-3">—</span>}</td>
                      <td>{r.status === "paid" ? <Badge tone="green" icon={<CircleCheck className="size-3.5" aria-hidden />}>Đã thanh toán</Badge> : r.overdue ? <Badge tone="red" icon={<TriangleAlert className="size-3.5" aria-hidden />}>Cần nhắc nợ</Badge> : r.status === "partial" ? <Badge tone="amber">Còn nợ</Badge> : <Badge tone="red">Chưa thanh toán</Badge>}</td>
                      <td className="num">{r.owed > 0 && <Button size="sm" onClick={() => { setPayRow(r); setF({ ...f, amountVnd: r.owed }); }}>Ghi thu</Button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {shownSup.length === 0 ? <Empty title="Chưa có công nợ nhà cung cấp" /> : (
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Nhà cung cấp</th><th className="num">Giá vốn đã xếp</th><th className="num">Đã trả</th><th className="num">Còn nợ</th><th>Lần trả gần nhất</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
                <tbody>
                  {shownSup.map((s) => (
                    <tr key={s.id}>
                      <td><p className="font-semibold text-ink">{s.name}</p>{s.phone && <p className="text-xs text-ink-3">{s.phone}</p>}</td>
                      <td className="num">{fmtVnd(s.cost)}</td><td className="num">{fmtVnd(s.paid)}</td>
                      <td className="num">{s.owed > 0 ? <b className="text-[#b42318]">{fmtVnd(s.owed)}</b> : <Badge tone="green">Đã đủ</Badge>}</td>
                      <td className="whitespace-nowrap">{fmtDate(s.lastPaid)}</td>
                      <td className="num">{s.owed > 0 && <Button size="sm" onClick={() => setPaySup({ id: s.id, name: s.name, owed: s.owed })}>Trả nợ</Button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <PaySupplierModal target={paySup} onClose={() => setPaySup(null)} />
      <Modal open={!!payRow} onClose={() => setPayRow(null)} title="Ghi nhận khách thanh toán" sub={payRow ? `${payRow.code} · ${payRow.groupName} · còn nợ ${fmtVnd(payRow.owed)}` : undefined}
        footer={<><Button variant="secondary" onClick={() => setPayRow(null)}>Huỷ</Button><Button loading={pending} disabled={f.amountVnd <= 0} onClick={submit}>Ghi nhận</Button></>}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Loại khoản thu"><Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="deposit">Đặt cọc</option><option value="advance">Tạm ứng</option><option value="payment">Thanh toán</option></Select></Field>
            <Field label="Ngày thu"><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          </div>
          <Field label="Số tiền (VND)"><Input type="number" min={0} step={10000} inputMode="numeric" value={f.amountVnd} onChange={(e) => setF({ ...f, amountVnd: Number(e.target.value) })} className="font-bold" /></Field>
          <Field label="Ghi chú"><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
        </div>
      </Modal>
    </>
  );
}
