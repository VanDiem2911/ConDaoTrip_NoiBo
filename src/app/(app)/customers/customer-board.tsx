"use client";

import { useMemo, useState } from "react";
import { Building2, Mail, Phone, Plus, Search, UserRound } from "lucide-react";
import { http, useAction } from "@/components/hooks";
import { Modal } from "@/components/modal";
import { Avatar, Badge, Button, Card, Empty, Field, Input, Select, Textarea, cn } from "@/components/ui";
import { fmtDate, fmtVnd } from "@/lib/money";
import type { listCustomers } from "@/lib/data";

type Cust = Awaited<ReturnType<typeof listCustomers>>[number];

export function CustomerBoard({ customers, showMoney, sales, canAssign }: { customers: Cust[]; showMoney: boolean; sales: { id: string; name: string }[]; canAssign: boolean }) {
  const { run, pending } = useAction();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "agent" | "individual">("all");
  const [open, setOpen] = useState(false);
  const empty = { name: "", kind: "individual", contactName: "", phone: "", email: "", country: "Việt Nam", note: "", saleId: "" };
  const [f, setF] = useState(empty);
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
  const saleName = (id?: string) => sales.find((s) => s.id === id)?.name;

  const rows = useMemo(
    () => customers.filter((c) => (kind === "all" || c.kind === kind) && (!q || norm(`${c.name} ${c.contactName ?? ""} ${c.phone ?? ""} ${c.email ?? ""}`).includes(norm(q)))),
    [customers, q, kind], // eslint-disable-line react-hooks/exhaustive-deps
  );

  async function save() {
    const r = await run(() => http("POST", "/api/customers", f), "Đã thêm khách hàng");
    if (r) { setOpen(false); setF(empty); }
  }
  const chip = (on: boolean) => cn("h-9 rounded-full px-3.5 text-[13px] font-semibold ring-1 ring-inset transition-colors", on ? "bg-brand-900 text-white ring-brand-900" : "bg-white/70 text-ink-2 ring-line hover:bg-brand-100");

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
          <div className="relative min-w-52 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
            <Input className="pl-10" placeholder="Tìm tên, SĐT, email…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Tìm khách hàng" />
          </div>
          <div role="group" aria-label="Loại khách" className="flex gap-2">
            {([["all", "Tất cả"], ["agent", "Đại lý / Đối tác"], ["individual", "Khách lẻ"]] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={chip(kind === k)}>{l}</button>)}
          </div>
          <Button className="ml-auto" onClick={() => setOpen(true)}><Plus className="size-4" aria-hidden /> Thêm khách</Button>
        </div>
        {rows.length === 0 ? <Empty icon={<UserRound className="size-7" />} title="Chưa có khách hàng" sub="Thêm khách hoặc đại lý để gắn vào báo giá." /> : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Khách hàng</th><th>Liên hệ</th><th>Quốc gia</th><th>Sale phụ trách</th><th className="num">Booking</th>{showMoney && <th className="num">Doanh thu</th>}{showMoney && <th className="num">Còn nợ</th>}<th>Chuyến gần nhất</th></tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td><div className="flex min-w-[220px] items-center gap-3"><Avatar name={c.name} /><div className="min-w-0"><p className="truncate font-semibold text-ink">{c.name}</p><Badge tone={c.kind === "agent" ? "gold" : "slate"} icon={c.kind === "agent" ? <Building2 className="size-3" aria-hidden /> : undefined}>{c.kind === "agent" ? "Đại lý / Đối tác" : "Khách lẻ"}</Badge></div></div></td>
                    <td className="whitespace-nowrap">{c.contactName && <p className="text-ink-2">{c.contactName}</p>}{c.phone && <p className="inline-flex items-center gap-1 text-ink-3"><Phone className="size-3.5" aria-hidden />{c.phone}</p>}{c.email && <p className="flex items-center gap-1 text-xs text-ink-3"><Mail className="size-3" aria-hidden />{c.email}</p>}</td>
                    <td>{c.country ?? "—"}</td>
                    <td className="whitespace-nowrap">{saleName(c.saleId) ?? (c.saleId ? "…" : "—")}</td>
                    <td className="num">{c.bookings}</td>
                    {showMoney && <td className="num font-semibold">{fmtVnd(c.revenue ?? 0)}</td>}
                    {showMoney && <td className="num">{c.owed ? <b className="text-[#b42318]">{fmtVnd(c.owed)}</b> : <span className="text-ink-3">—</span>}</td>}
                    <td className="whitespace-nowrap">{fmtDate(c.lastTrip)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Thêm khách hàng / đại lý"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Huỷ</Button><Button loading={pending} disabled={!f.name.trim()} onClick={save}>Lưu</Button></>}>
        <div className="space-y-4">
          <Field label="Tên khách / công ty *"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Loại"><Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="individual">Khách lẻ</option><option value="agent">Đại lý / Đối tác</option></Select></Field>
            <Field label="Quốc gia"><Input value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} /></Field>
            <Field label="Người liên hệ"><Input value={f.contactName} onChange={(e) => setF({ ...f, contactName: e.target.value })} /></Field>
            <Field label="Số điện thoại"><Input inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          </div>
          <Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          {canAssign && <Field label="Sale phụ trách"><Select value={f.saleId} onChange={(e) => setF({ ...f, saleId: e.target.value })}><option value="">— Chưa gán —</option>{sales.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>}
          <Field label="Ghi chú"><Textarea rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
        </div>
      </Modal>
    </>
  );
}
