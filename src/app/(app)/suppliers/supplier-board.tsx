"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardPaste, Phone, Plus, Search, Trash2, Truck, Wallet } from "lucide-react";
import { http, useAction } from "@/components/hooks";
import { Modal } from "@/components/modal";
import { PaySupplierModal, type PayTarget } from "@/components/pay-supplier-modal";
import { Badge, Button, Card, Empty, Field, Input, Select, Stat, Textarea, cn } from "@/components/ui";
import { compactVnd, fmtDate, fmtVnd } from "@/lib/money";
import { SERVICE_CATEGORIES } from "@/lib/types";
import type { listSuppliers } from "@/lib/data";

type Sup = Awaited<ReturnType<typeof listSuppliers>>[number];

export function SupplierBoard({ suppliers }: { suppliers: Sup[] }) {
  const { run, pending } = useAction();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [debtOnly, setDebtOnly] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulk, setBulk] = useState("");
  const [nw, setNw] = useState({ name: "", phone: "", contactName: "", category: "hotel", address: "", bank: "" });
  const [pay, setPay] = useState<PayTarget | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [price, setPrice] = useState({ name: "", category: "hotel", unit: "lượt", costVnd: 0 });
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

  const rows = useMemo(
    () => suppliers.filter((s) => (cat === "all" || s.categories.includes(cat)) && (!debtOnly || s.owed > 0) && (!q || norm(`${s.name} ${s.contactName ?? ""} ${s.phone ?? ""}`).includes(norm(q)))),
    [suppliers, q, cat, debtOnly], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const owedTotal = suppliers.reduce((s, x) => s + x.owed, 0);
  const cats = Array.from(new Set(suppliers.flatMap((s) => s.categories)));
  const open = suppliers.find((s) => s.id === openId);

  async function add() {
    const r = await run(() => http("POST", "/api/suppliers", nw), "Đã thêm nhà cung cấp");
    if (r) { setAddOpen(false); setNw({ name: "", phone: "", contactName: "", category: "hotel", address: "", bank: "" }); }
  }
  async function importBulk() {
    const r = await run(() => http<{ created: number }>("POST", "/api/suppliers", { bulk }), undefined);
    if (r) { setBulkOpen(false); setBulk(""); }
  }
  async function addPrice() {
    if (!open) return;
    const r = await run(() => http("PATCH", `/api/suppliers/${open.id}`, { addPrice: price }), "Đã thêm vào bảng giá");
    if (r) setPrice({ ...price, name: "", costVnd: 0 });
  }

  const chip = (on: boolean) => cn("h-9 rounded-full px-3.5 text-[13px] font-semibold ring-1 ring-inset transition-colors", on ? "bg-brand-900 text-white ring-brand-900" : "bg-white/70 text-ink-2 ring-line hover:bg-brand-100");

  return (
    <>
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Stat tone="sea" icon={<Truck className="size-7" strokeWidth={1.7} aria-hidden />} value={suppliers.length} label="Nhà cung cấp" />
        <Stat tone="red" icon={<Wallet className="size-7" strokeWidth={1.7} aria-hidden />} value={compactVnd(owedTotal)} label="Còn phải trả NCC" sub={fmtVnd(owedTotal)} delay={60} />
        <Stat tone="gold" icon={<Wallet className="size-7" strokeWidth={1.7} aria-hidden />} value={suppliers.filter((s) => s.owed > 0).length} label="NCC đang còn nợ" delay={120} />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
          <div className="relative min-w-52 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
            <Input className="pl-10" placeholder="Tìm tên, SĐT, người liên hệ…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Tìm nhà cung cấp" />
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setBulkOpen(true)}><ClipboardPaste className="size-4" aria-hidden /> Dán nhiều NCC</Button>
            <Button onClick={() => setAddOpen(true)}><Plus className="size-4" aria-hidden /> Thêm NCC</Button>
          </div>
          <div className="flex w-full flex-wrap gap-2" role="group" aria-label="Lọc nhóm dịch vụ">
            <button type="button" aria-pressed={cat === "all"} onClick={() => setCat("all")} className={chip(cat === "all")}>Tất cả</button>
            {cats.map((c) => <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)} className={chip(cat === c)}>{SERVICE_CATEGORIES[c] ?? c}</button>)}
            <button type="button" aria-pressed={debtOnly} onClick={() => setDebtOnly((v) => !v)} className={chip(debtOnly)}>Còn công nợ</button>
          </div>
        </div>
        {rows.length === 0 ? <Empty icon={<Truck className="size-7" />} title="Không có nhà cung cấp phù hợp" /> : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Nhà cung cấp</th><th>Nhóm dịch vụ</th><th>Liên hệ</th><th className="num">Giá vốn đã xếp</th><th className="num">Đã trả</th><th className="num">Còn nợ</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td><button type="button" onClick={() => setOpenId(s.id)} className="text-left font-semibold text-ink hover:text-brand-700 hover:underline">{s.name}</button>{!s.active && <Badge tone="slate" className="ml-2">Ngừng</Badge>}</td>
                    <td><div className="flex max-w-[220px] flex-wrap gap-1">{s.categories.length ? s.categories.map((c) => <Badge key={c} tone="slate">{SERVICE_CATEGORIES[c] ?? c}</Badge>) : <span className="text-ink-3">—</span>}</div></td>
                    <td className="whitespace-nowrap">{s.contactName && <p className="text-ink-2">{s.contactName}</p>}{s.phone ? <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 text-brand-700 hover:underline"><Phone className="size-3.5" aria-hidden />{s.phone}</a> : <span className="text-ink-3">—</span>}</td>
                    <td className="num">{fmtVnd(s.cost)}</td>
                    <td className="num">{fmtVnd(s.paid)}</td>
                    <td className="num">{s.owed > 0 ? <b className="text-[#b42318]">{fmtVnd(s.owed)}</b> : <Badge tone="green">Đã đủ</Badge>}</td>
                    <td className="num"><div className="flex justify-end gap-2"><Button size="sm" variant="secondary" onClick={() => setOpenId(s.id)}>Chi tiết</Button>{s.owed > 0 && <Button size="sm" onClick={() => setPay({ id: s.id, name: s.name, owed: s.owed })}>Trả nợ</Button>}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Thêm 1 NCC */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Thêm nhà cung cấp" sub="Chỉ cần tên là đủ — bổ sung thông tin sau."
        footer={<><Button variant="secondary" onClick={() => setAddOpen(false)}>Huỷ</Button><Button loading={pending} disabled={!nw.name.trim()} onClick={add}>Lưu</Button></>}>
        <div className="space-y-4">
          <Field label="Tên nhà cung cấp *"><Input value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value })} autoFocus /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nhóm dịch vụ"><Select value={nw.category} onChange={(e) => setNw({ ...nw, category: e.target.value })}>{Object.entries(SERVICE_CATEGORIES).filter(([k]) => k !== "package" && k !== "tour").map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field label="Số điện thoại"><Input inputMode="tel" value={nw.phone} onChange={(e) => setNw({ ...nw, phone: e.target.value })} /></Field>
            <Field label="Người liên hệ"><Input value={nw.contactName} onChange={(e) => setNw({ ...nw, contactName: e.target.value })} /></Field>
            <Field label="Địa chỉ"><Input value={nw.address} onChange={(e) => setNw({ ...nw, address: e.target.value })} /></Field>
          </div>
          <Field label="Tài khoản ngân hàng"><Input value={nw.bank} onChange={(e) => setNw({ ...nw, bank: e.target.value })} placeholder="Ngân hàng – số TK – tên TK" /></Field>
        </div>
      </Modal>

      {/* Dán nhiều NCC */}
      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="Dán nhiều nhà cung cấp" sub="Mỗi dòng 1 NCC: Tên ; SĐT ; Nhóm dịch vụ ; Người liên hệ — hoặc copy từ Excel (cột cách nhau bằng Tab)." width="max-w-2xl"
        footer={<><Button variant="secondary" onClick={() => setBulkOpen(false)}>Huỷ</Button><Button loading={pending} disabled={!bulk.trim()} onClick={importBulk}>Nhập {bulk.split(/\n/).filter((l) => l.trim()).length || ""} dòng</Button></>}>
        <Textarea rows={9} value={bulk} onChange={(e) => setBulk(e.target.value)} className="font-mono text-[13px]" placeholder={"Khách sạn Biển Xanh ; 0903 111 222 ; khách sạn ; Lễ tân\nNhà xe Côn Sơn ; 0903 333 444 ; xe đón tiễn ; Anh Sơn\nNhà hàng Bến Đầm ; 0903 555 666 ; nhà hàng"} />
        <p className="mt-2 text-xs text-ink-3">Hệ thống tự đoán nhóm dịch vụ từ chữ bạn gõ (khách sạn, cano, xe, nhà hàng, HDV, vé…).</p>
      </Modal>

      {/* Chi tiết NCC */}
      <Modal open={!!open} onClose={() => setOpenId(null)} side title={open?.name ?? ""} sub={open ? `${open.categories.map((c) => SERVICE_CATEGORIES[c] ?? c).join(" · ")}` : undefined}
        footer={open && open.owed > 0 ? <Button onClick={() => setPay({ id: open.id, name: open.name, owed: open.owed })}>Trả nợ {fmtVnd(open.owed)}</Button> : undefined}>
        {open && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-white/70 p-3 ring-1 ring-inset ring-line"><p className="text-xs text-ink-3">Giá vốn</p><p className="font-bold">{compactVnd(open.cost)}</p></div>
              <div className="rounded-2xl bg-white/70 p-3 ring-1 ring-inset ring-line"><p className="text-xs text-ink-3">Đã trả</p><p className="font-bold">{compactVnd(open.paid)}</p></div>
              <div className="rounded-2xl bg-[#fde8e8] p-3 ring-1 ring-inset ring-[#f8c9c9]"><p className="text-xs text-[#b42318]">Còn nợ</p><p className="font-bold text-[#b42318]">{compactVnd(open.owed)}</p></div>
            </div>
            <section>
              <h3 className="mb-2 text-sm font-bold text-ink">Liên hệ</h3>
              <dl className="space-y-1 text-sm">
                {open.contactName && <p><dt className="inline text-ink-3">Người liên hệ: </dt><dd className="inline font-medium">{open.contactName}</dd></p>}
                {open.phone && <p><dt className="inline text-ink-3">SĐT: </dt><dd className="inline font-medium"><a className="text-brand-700 hover:underline" href={`tel:${open.phone.replace(/\s/g, "")}`}>{open.phone}</a></dd></p>}
                {open.email && <p><dt className="inline text-ink-3">Email: </dt><dd className="inline font-medium">{open.email}</dd></p>}
                {open.address && <p><dt className="inline text-ink-3">Địa chỉ: </dt><dd className="inline font-medium">{open.address}</dd></p>}
                {open.bank && <p><dt className="inline text-ink-3">Tài khoản: </dt><dd className="inline font-medium">{open.bank}</dd></p>}
              </dl>
            </section>
            <section>
              <h3 className="mb-2 text-sm font-bold text-ink">Bảng giá đầu vào</h3>
              {open.prices.length === 0 ? <p className="text-sm text-ink-3">Chưa có. Thêm giá để điều hành chọn nhanh khi xếp dịch vụ.</p> : (
                <ul className="divide-y divide-line/70 rounded-2xl bg-white/60 ring-1 ring-inset ring-line">
                  {open.prices.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                      <span className="min-w-0"><span className="block truncate font-medium">{p.name}</span><span className="text-xs text-ink-3">{SERVICE_CATEGORIES[p.category] ?? p.category}</span></span>
                      <span className="flex shrink-0 items-center gap-2"><b className="text-brand-700">{fmtVnd(p.costVnd)}</b><span className="text-xs text-ink-3">/{p.unit}</span>
                        <button type="button" aria-label={`Xoá ${p.name}`} onClick={() => run(() => http("PATCH", `/api/suppliers/${open.id}`, { removePrice: p.id }), "Đã xoá")} className="grid size-9 place-items-center rounded-lg text-[#b42318] hover:bg-[#fde8e8]"><Trash2 className="size-4" /></button></span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_130px]">
                <Input placeholder="Tên dịch vụ / hạng phòng…" value={price.name} onChange={(e) => setPrice({ ...price, name: e.target.value })} aria-label="Tên dịch vụ" />
                <Input type="number" min={0} step={1000} inputMode="numeric" placeholder="Giá vốn" value={price.costVnd || ""} onChange={(e) => setPrice({ ...price, costVnd: Number(e.target.value) })} aria-label="Giá vốn" />
                <Select value={price.category} onChange={(e) => setPrice({ ...price, category: e.target.value })} aria-label="Nhóm">{Object.entries(SERVICE_CATEGORIES).filter(([k]) => k !== "package" && k !== "tour").map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                <Input placeholder="Đơn vị (đêm, lượt…)" value={price.unit} onChange={(e) => setPrice({ ...price, unit: e.target.value })} aria-label="Đơn vị" />
              </div>
              <Button className="mt-2" size="sm" variant="secondary" loading={pending} disabled={!price.name.trim()} onClick={addPrice}><Plus className="size-4" aria-hidden /> Thêm vào bảng giá</Button>
            </section>
            <section>
              <h3 className="mb-2 text-sm font-bold text-ink">Dịch vụ đã xếp ({open.items.length})</h3>
              {open.items.length === 0 ? <p className="text-sm text-ink-3">Chưa xếp dịch vụ nào cho NCC này.</p> : (
                <ul className="divide-y divide-line/70 text-sm">
                  {open.items.slice(0, 12).map((i, k) => (
                    <li key={k} className="flex items-start justify-between gap-3 py-2"><span className="min-w-0"><Link href={`/bookings/${i.bookingId}`} className="font-medium hover:text-brand-700 hover:underline">{i.name}</Link><span className="block text-xs text-ink-3">{i.code} · {i.group} · {fmtDate(i.date)}</span></span><b className="shrink-0">{fmtVnd(i.cost)}</b></li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <h3 className="mb-2 text-sm font-bold text-ink">Lịch sử thanh toán</h3>
              {open.pays.length === 0 ? <p className="text-sm text-ink-3">Chưa thanh toán lần nào.</p> : (
                <ul className="divide-y divide-line/70 text-sm">
                  {open.pays.slice(0, 10).map((p) => <li key={p.id} className="flex items-start justify-between gap-3 py-2"><span className="min-w-0"><span className="block font-medium">{fmtDate(p.date)}</span><span className="text-xs text-ink-3">{p.note ?? ""}</span></span><b className="shrink-0 text-[#b42318]">−{fmtVnd(p.amount)}</b></li>)}
                </ul>
              )}
            </section>
          </div>
        )}
      </Modal>
      <PaySupplierModal target={pay} onClose={() => setPay(null)} />
    </>
  );
}
