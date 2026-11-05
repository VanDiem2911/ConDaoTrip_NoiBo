"use client";

import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Plus, Scale, Trash2 } from "lucide-react";
import { http, useAction } from "@/components/hooks";
import { Modal } from "@/components/modal";
import { Badge, Button, Card, Empty, Field, Input, Select, Stat, cn } from "@/components/ui";
import { compactVnd, fmtDate, fmtVnd, todayIso } from "@/lib/money";
import { TX_KIND_LABEL, type Transaction } from "@/lib/types";
import type { S } from "@/lib/data";

export function CashBoard({ txs, canDelete }: { txs: S<Transaction>[]; canDelete: boolean }) {
  const { run, pending } = useAction();
  const [type, setType] = useState<"all" | "thu" | "chi">("all");
  const [month, setMonth] = useState("all");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ type: "chi", kind: "expense", amountVnd: 0, date: todayIso(), method: "Chuyển khoản", partyName: "", note: "" });

  const months = useMemo(() => Array.from(new Set(txs.map((t) => t.date.slice(0, 7)))).sort().reverse(), [txs]);
  const shown = txs.filter((t) => (type === "all" || t.type === type) && (month === "all" || t.date.startsWith(month)));
  const thu = shown.filter((t) => t.type === "thu").reduce((s, t) => s + t.amountVnd, 0);
  const chi = shown.filter((t) => t.type === "chi").reduce((s, t) => s + t.amountVnd, 0);

  async function save() {
    const r = await run(() => http("POST", "/api/transactions", f), "Đã ghi sổ");
    if (r) { setOpen(false); setF({ ...f, amountVnd: 0, partyName: "", note: "" }); }
  }
  async function del(id: string) {
    if (!confirm("Xoá bút toán này? Số dư và công nợ liên quan sẽ thay đổi.")) return;
    await run(() => http("DELETE", `/api/transactions/${id}`), "Đã xoá bút toán");
  }
  const chip = (on: boolean) => cn("h-9 rounded-full px-3.5 text-[13px] font-semibold ring-1 ring-inset transition-colors", on ? "bg-brand-900 text-white ring-brand-900" : "bg-white/70 text-ink-2 ring-line hover:bg-brand-100");

  return (
    <>
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Stat tone="green" icon={<ArrowDownLeft className="size-7" strokeWidth={1.7} aria-hidden />} value={compactVnd(thu)} label="Tổng thu" sub={fmtVnd(thu)} />
        <Stat tone="red" icon={<ArrowUpRight className="size-7" strokeWidth={1.7} aria-hidden />} value={compactVnd(chi)} label="Tổng chi" sub={fmtVnd(chi)} delay={60} />
        <Stat tone="gold" icon={<Scale className="size-7" strokeWidth={1.7} aria-hidden />} value={compactVnd(thu - chi)} label="Chênh lệch thu − chi" sub={fmtVnd(thu - chi)} delay={120} />
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
          <div role="group" aria-label="Loại giao dịch" className="flex gap-2">
            {([["all", "Tất cả"], ["thu", "Thu"], ["chi", "Chi"]] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={type === k} onClick={() => setType(k)} className={chip(type === k)}>{l}</button>)}
          </div>
          <Select className="h-10 w-44" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Tháng">
            <option value="all">Mọi tháng</option>{months.map((m) => <option key={m} value={m}>Tháng {m.slice(5)}/{m.slice(0, 4)}</option>)}
          </Select>
          <Button className="ml-auto" onClick={() => setOpen(true)}><Plus className="size-4" aria-hidden /> Ghi thu / chi</Button>
        </div>
        {shown.length === 0 ? <Empty title="Chưa có giao dịch" /> : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Ngày</th><th>Loại</th><th>Đối tượng / nội dung</th><th>Hình thức</th><th className="num">Số tiền</th>{canDelete && <th><span className="sr-only">Xoá</span></th>}</tr></thead>
              <tbody>
                {shown.map((t) => (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap">{fmtDate(t.date)}</td>
                    <td><Badge tone={t.type === "thu" ? "green" : "red"}>{t.type === "thu" ? "Thu" : "Chi"} · {TX_KIND_LABEL[t.kind]}</Badge></td>
                    <td className="max-w-[360px]"><p className="truncate font-medium text-ink">{t.partyName ?? "—"}</p><p className="truncate text-xs text-ink-3">{[t.bookingCode, t.note].filter(Boolean).join(" · ")}</p></td>
                    <td className="whitespace-nowrap text-ink-2">{t.method}</td>
                    <td className={cn("num font-bold", t.type === "thu" ? "text-brand-700" : "text-[#b42318]")}>{t.type === "thu" ? "+" : "−"}{fmtVnd(t.amountVnd)}</td>
                    {canDelete && <td className="num"><button type="button" aria-label="Xoá bút toán" onClick={() => del(t.id)} className="grid size-9 place-items-center rounded-lg text-[#b42318] hover:bg-[#fde8e8]"><Trash2 className="size-4" /></button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Ghi thu / chi" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Huỷ</Button><Button loading={pending} disabled={f.amountVnd <= 0} onClick={save}>Ghi sổ</Button></>}>
        <div className="space-y-4">
          <div role="group" aria-label="Thu hay chi" className="grid grid-cols-2 gap-2">
            {(["thu", "chi"] as const).map((t) => <button key={t} type="button" aria-pressed={f.type === t} onClick={() => setF({ ...f, type: t, kind: t === "thu" ? "income" : "expense" })} className={cn("h-11 rounded-xl text-sm font-bold ring-1 ring-inset transition-colors", f.type === t ? (t === "thu" ? "bg-brand-600 text-white ring-brand-600" : "bg-[#b42318] text-white ring-[#b42318]") : "bg-white/70 text-ink-2 ring-line")}>{t === "thu" ? "Thu" : "Chi"}</button>)}
          </div>
          <Field label="Khoản mục"><Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
            {f.type === "thu" ? <option value="income">Thu khác</option> : <><option value="expense">Chi phí vận hành</option><option value="commission">Chi hoa hồng (chung)</option></>}
          </Select></Field>
          <Field label="Số tiền (VND)"><Input type="number" min={0} step={10000} inputMode="numeric" value={f.amountVnd} onChange={(e) => setF({ ...f, amountVnd: Number(e.target.value) })} className="font-bold" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ngày"><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
            <Field label="Hình thức"><Select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}><option>Chuyển khoản</option><option>Tiền mặt</option></Select></Field>
          </div>
          <Field label="Đối tượng"><Input value={f.partyName} onChange={(e) => setF({ ...f, partyName: e.target.value })} placeholder="Người nhận / người nộp" /></Field>
          <Field label="Nội dung"><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
        </div>
      </Modal>
    </>
  );
}
