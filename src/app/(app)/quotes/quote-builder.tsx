"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, CircleCheck, Plus, Printer, Save, Search, Send, Trash2 } from "lucide-react";
import { CategoryGlyph } from "@/components/nav-icon";
import { http, useAction } from "@/components/hooks";
import { Badge, Button, Card, CardHeader, Field, Input, Select, Textarea, cn } from "@/components/ui";
import { CURRENCIES, currencyMeta, fmtDate, fmtMoney, fmtVnd } from "@/lib/money";
import { itemQuantity, itemTotal, quoteTotals, uid } from "@/lib/pricing";
import { isStaff } from "@/lib/access";
import { SERVICE_CATEGORIES, type Quote, type QuoteItem, type Role, type Service, type Tour } from "@/lib/types";
import type { S } from "@/lib/data";

interface Props {
  role: Role;
  userId: string;
  tours: S<Tour>[];
  services: S<Service>[];
  customers: { id: string; name: string; saleId?: string }[];
  sales: { id: string; name: string }[];
  rates: Record<string, number>;
  childRatio: number;
  company: { name: string; brand: string; phone: string; email: string; address: string; taxCode: string };
  quote?: S<Quote>;
  presetAdd?: string;
  defaultDate: string;
}

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

function itemFromTour(t: S<Tour>): QuoteItem {
  const pkg = t.type === "package";
  return {
    id: uid(), refType: "tour", refId: t.id, name: t.name, category: pkg ? "package" : "tour", origin: pkg ? "package" : "retail",
    basis: "pax", qty: 1, unitPriceVnd: t.priceVnd, components: pkg ? t.components : undefined, image: t.image,
  };
}
function itemFromService(s: S<Service>): QuoteItem {
  return { id: uid(), refType: "service", refId: s.id, name: s.name, category: s.category, origin: "retail", basis: s.basis, qty: 1, unitPriceVnd: s.priceVnd };
}

export function QuoteBuilder(p: Props) {
  const staff = isStaff(p.role);
  const q = p.quote;
  const readOnly = !!q && q.status !== "draft";
  const { run, pending, router } = useAction();

  const [form, setForm] = useState(() => ({
    groupName: q?.groupName ?? "",
    customerId: q?.customerId ?? "",
    customerName: q?.customerName ?? "",
    saleId: q?.saleId ?? (p.role === "sale" ? p.userId : ""),
    travelDate: q?.travelDate ?? addDays(p.defaultDate, 14),
    adults: q?.adults ?? 2,
    children: q?.children ?? 0,
    infants: q?.infants ?? 0,
    currency: q?.currency ?? "VND",
    mode: (q?.mode ?? "total") as "total" | "perPax",
    discountVnd: q?.discountVnd ?? 0,
    note: q?.note ?? "",
  }));
  const [items, setItems] = useState<QuoteItem[]>(() => {
    if (q) return q.items;
    const [kind, id] = (p.presetAdd ?? "").split(":");
    if (kind === "tour") { const t = p.tours.find((x) => x.id === id); if (t) return [itemFromTour(t)]; }
    if (kind === "service") { const s = p.services.find((x) => x.id === id); if (s) return [itemFromService(s)]; }
    return [];
  });
  const [tab, setTab] = useState<"package" | "day" | "service">("package");
  const [search, setSearch] = useState("");

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const pax = { adults: form.adults, children: form.children, infants: form.infants, childRatio: p.childRatio };
  const totals = useMemo(() => quoteTotals(items, pax, staff ? form.discountVnd : 0), [items, form.adults, form.children, form.infants, form.discountVnd, p.childRatio, staff]); // eslint-disable-line react-hooks/exhaustive-deps

  const currencies = CURRENCIES.filter((c) => c.code === "VND" || p.rates[c.code]);
  const cur = currencyMeta(form.currency);
  const shown = form.mode === "total" ? totals.total : totals.perPax;

  /* ---------- thao tác dòng ---------- */
  const add = (it: QuoteItem) =>
    setItems((l) => {
      const ex = l.find((x) => x.refId && x.refId === it.refId && x.refType === it.refType);
      return ex ? l.map((x) => (x.id === ex.id ? { ...x, qty: x.qty + 1 } : x)) : [...l, it];
    });
  const patch = (id: string, v: Partial<QuoteItem>) => setItems((l) => l.map((x) => (x.id === id ? { ...x, ...v } : x)));
  const remove = (id: string) => setItems((l) => l.filter((x) => x.id !== id));

  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
  const hit = (s: string) => !search || norm(s).includes(norm(search));
  const pickTours = p.tours.filter((t) => t.active && t.type === tab && hit(t.name));
  const pickServices = p.services.filter((s) => s.active && hit(s.name + (SERVICE_CATEGORIES[s.category] ?? "")));

  /* ---------- lưu / xác nhận ---------- */
  const payload = () => ({ ...form, items, customerId: form.customerId || undefined });

  async function save(): Promise<string | undefined> {
    const r = await run(
      () => (q ? http<{ id: string }>("PUT", `/api/quotes/${q.id}`, payload()) : http<{ id: string }>("POST", "/api/quotes", payload())),
      undefined, { refresh: false },
    );
    return r?.id;
  }
  async function onSave() {
    const id = await save();
    if (id) { router.replace(`/quotes/${id}`); router.refresh(); }
  }
  async function onConfirm() {
    const id = await save();
    if (!id) return;
    const r = await run(() => http<{ bookingId: string; bookingIds: string[] }>("POST", `/api/quotes/${id}/confirm`), staff ? "Đã xác nhận — điều hành sẽ thấy các dịch vụ cần xếp" : "Đã gửi yêu cầu đặt dịch vụ", { refresh: false });
    if (r) {
      // Khách hàng chỉ xem báo giá; nhân viên chuyển sang booking (tách 2 đơn nếu có cả trọn gói và dịch vụ lẻ)
      router.push(!staff ? `/quotes/${id}` : r.bookingIds.length > 1 ? "/bookings" : `/bookings/${r.bookingId}`);
      router.refresh();
    }
  }
  async function onCancel() {
    if (!q || !confirm("Huỷ báo giá nháp này?")) return;
    const r = await run(() => http("DELETE", `/api/quotes/${q.id}`), "Đã huỷ báo giá", { refresh: false });
    if (r) router.push("/quotes");
  }

  const canSubmit = items.length > 0 && form.groupName.trim().length > 0;

  return (
    <>
      <div className="no-print grid gap-5 xl:grid-cols-[1fr_390px]">
        <div className="min-w-0 space-y-5">
          {/* 1. Thông tin đoàn */}
          <Card>
            <CardHeader title="1 · Thông tin đoàn / khách" sub="Mỗi đoàn một báo giá riêng nên không bị lẫn với đoàn khác." action={q && <Badge tone={q.status === "draft" ? "amber" : q.status === "confirmed" ? "green" : "slate"}>{q.status === "draft" ? "Nháp" : q.status === "confirmed" ? "Đã xác nhận" : "Đã huỷ"}</Badge>} />
            <fieldset disabled={readOnly} className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              <Field label="Tên đoàn / khách *" className="sm:col-span-2">
                <Input value={form.groupName} onChange={(e) => set("groupName", e.target.value)} placeholder="VD: Đoàn Sunrise 10/11 – 12 khách" maxLength={120} />
              </Field>
              {staff ? (
                <Field label="Khách hàng / Đối tác">
                  <Select value={form.customerId} onChange={(e) => {
                    const c = p.customers.find((x) => x.id === e.target.value);
                    setForm((f) => ({ ...f, customerId: e.target.value, saleId: p.role === "sale" ? f.saleId : c?.saleId ?? f.saleId }));
                  }}>
                    <option value="">— Khách vãng lai —</option>
                    {p.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </Field>
              ) : null}
              {staff && !form.customerId && (
                <Field label="Tên khách (vãng lai)">
                  <Input value={form.customerName} onChange={(e) => set("customerName", e.target.value)} placeholder="Tuỳ chọn" />
                </Field>
              )}
              <Field label="Ngày khởi hành *">
                <Input type="date" value={form.travelDate} onChange={(e) => set("travelDate", e.target.value)} />
              </Field>
              {p.sales.length > 0 && (
                <Field label="Sale phụ trách">
                  <Select value={form.saleId} onChange={(e) => set("saleId", e.target.value)}>
                    <option value="">— Chưa gán —</option>
                    {p.sales.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                </Field>
              )}
              <div className="grid grid-cols-3 gap-3 sm:col-span-2">
                <Field label="Người lớn"><Input type="number" min={0} inputMode="numeric" value={form.adults} onChange={(e) => set("adults", Math.max(0, Number(e.target.value)))} /></Field>
                <Field label="Trẻ em (6–11)" hint={`Tính ${Math.round(p.childRatio * 100)}% giá`}><Input type="number" min={0} inputMode="numeric" value={form.children} onChange={(e) => set("children", Math.max(0, Number(e.target.value)))} /></Field>
                <Field label="Em bé (<6)" hint="Miễn phí"><Input type="number" min={0} inputMode="numeric" value={form.infants} onChange={(e) => set("infants", Math.max(0, Number(e.target.value)))} /></Field>
              </div>
              <Field label="Ghi chú" className="sm:col-span-2"><Textarea value={form.note} onChange={(e) => set("note", e.target.value)} rows={2} placeholder="Yêu cầu đặc biệt của đối tác…" /></Field>
            </fieldset>
          </Card>

          {/* 2. Chọn dịch vụ */}
          {!readOnly && (
            <Card>
              <CardHeader title="2 · Chọn tour & dịch vụ" sub="Bấm “Thêm” để đưa vào báo giá. Tour trọn gói tự gồm các dịch vụ thành phần." />
              <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <div role="tablist" aria-label="Loại" className="inline-flex rounded-2xl bg-white/70 p-1 ring-1 ring-inset ring-line">
                    {([["package", "Tour trọn gói"], ["day", "Tour trong ngày"], ["service", "Dịch vụ lẻ"]] as const).map(([k, l]) => (
                      <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("h-9 rounded-xl px-3.5 text-[13px] font-semibold transition-all", tab === k ? "bg-brand-900 text-white" : "text-ink-2 hover:bg-brand-100")}>{l}</button>
                    ))}
                  </div>
                  <div className="relative min-w-44 flex-1">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
                    <Input className="h-10 pl-10" placeholder="Tìm…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Tìm tour, dịch vụ" />
                  </div>
                </div>
                <ul className="max-h-[360px] divide-y divide-line/70 overflow-y-auto rounded-2xl bg-white/60 ring-1 ring-inset ring-line">
                  {tab !== "service"
                    ? pickTours.map((t) => (
                        <li key={t.id} className="flex items-center gap-3 p-3">
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-600"><CategoryGlyph category={t.type === "package" ? "package" : "tour"} /></span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-ink">{t.name}</p>
                            <p className="text-xs text-ink-3">{t.duration} · {t.priceVnd ? `${fmtVnd(t.priceVnd)}/khách` : "Liên hệ"}</p>
                          </div>
                          <Button size="sm" variant="secondary" onClick={() => add(itemFromTour(t))} aria-label={`Thêm ${t.name}`}><Plus className="size-4" aria-hidden /> Thêm</Button>
                        </li>
                      ))
                    : pickServices.map((s) => (
                        <li key={s.id} className="flex items-center gap-3 p-3">
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-600"><CategoryGlyph category={s.category} /></span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-ink">{s.name}</p>
                            <p className="text-xs text-ink-3">{SERVICE_CATEGORIES[s.category]} · {fmtVnd(s.priceVnd)}/{s.unit}{s.basis === "pax" ? "/khách" : ""}</p>
                          </div>
                          <Button size="sm" variant="secondary" onClick={() => add(itemFromService(s))} aria-label={`Thêm ${s.name}`}><Plus className="size-4" aria-hidden /> Thêm</Button>
                        </li>
                      ))}
                  {((tab !== "service" && pickTours.length === 0) || (tab === "service" && pickServices.length === 0)) && <li className="p-6 text-center text-sm text-ink-3">Không tìm thấy.</li>}
                </ul>
                {staff && (
                  <Button className="mt-3" variant="ghost" size="sm" onClick={() => setItems((l) => [...l, { id: uid(), refType: "custom", name: "", category: "other", origin: "retail", basis: "group", qty: 1, unitPriceVnd: 0 }])}>
                    <Plus className="size-4" aria-hidden /> Thêm dòng tuỳ chọn (nhập tay)
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* 3. Các dòng báo giá */}
          <Card>
            <CardHeader title={`${readOnly ? "" : "3 · "}Nội dung báo giá`} sub={items.length ? `${items.length} dòng · ${totals.paying} khách tính tiền (${form.adults} NL + ${form.children} TE × ${Math.round(p.childRatio * 100)}%)` : undefined} />
            {items.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-ink-3">Chưa có dòng nào. Hãy chọn tour hoặc dịch vụ ở trên.</p>
            ) : (
              <ul className="divide-y divide-line/70 px-2 pb-2 pt-2 sm:px-3">
                {items.map((it) => {
                  const qty = itemQuantity(it, pax);
                  const priceEditable = staff && !readOnly;
                  return (
                    <li key={it.id} className="p-3">
                      <div className="flex flex-wrap items-start gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-600"><CategoryGlyph category={it.category} /></span>
                        <div className="min-w-0 flex-1 basis-56">
                          {it.refType === "custom" && !readOnly ? (
                            <Input value={it.name} onChange={(e) => patch(it.id, { name: e.target.value })} placeholder="Tên dịch vụ" aria-label="Tên dịch vụ" className="h-10" />
                          ) : <p className="text-sm font-semibold text-ink">{it.name}</p>}
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge tone={it.origin === "package" ? "gold" : "sea"}>{it.origin === "package" ? "Tour trọn gói" : "Dịch vụ lẻ"}</Badge>
                            <span className="text-xs text-ink-3">{it.basis === "pax" ? `× ${totals.paying} khách` : "theo đoàn"}</span>
                          </div>
                          {it.components && it.components.length > 0 && (
                            <details className="group mt-1.5 text-xs text-ink-3">
                              <summary className="inline-flex list-none items-center gap-1 rounded font-semibold text-brand-700"><ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden /> Gồm {it.components.length} dịch vụ</summary>
                              <ul className="mt-1 list-inside list-disc space-y-0.5">{it.components.map((c, i) => <li key={i}>{c.name}</li>)}</ul>
                            </details>
                          )}
                        </div>
                        <div className="flex flex-wrap items-end gap-2">
                          <Field label={it.basis === "pax" ? "SL/khách" : "Số lượng"} className="w-20">
                            <Input type="number" min={0.5} step={0.5} inputMode="decimal" disabled={readOnly} value={it.qty} onChange={(e) => patch(it.id, { qty: Math.max(0, Number(e.target.value)) })} className="h-10 px-2.5" />
                          </Field>
                          {priceEditable ? (
                            <Field label="Đơn giá (VND)" className="w-36">
                              <Input type="number" min={0} step={1000} inputMode="numeric" value={it.unitPriceVnd} onChange={(e) => patch(it.id, { unitPriceVnd: Math.max(0, Number(e.target.value)) })} className="h-10 px-2.5" />
                            </Field>
                          ) : (
                            <div className="w-32 text-right"><p className="text-[13px] font-semibold text-ink-2">Đơn giá</p><p className="py-2 text-sm">{fmtMoney(it.unitPriceVnd, form.currency, p.rates)}</p></div>
                          )}
                          <div className="w-36 text-right">
                            <p className="text-[13px] font-semibold text-ink-2">Thành tiền</p>
                            <p className="py-2 text-[15px] font-bold text-ink">{fmtMoney(itemTotal(it, pax), form.currency, p.rates)}</p>
                          </div>
                          {!readOnly && (
                            <button type="button" onClick={() => remove(it.id)} aria-label={`Xoá ${it.name || "dòng"}`} className="mb-0.5 grid size-10 place-items-center rounded-xl text-[#b42318] hover:bg-[#fde8e8]"><Trash2 className="size-4" /></button>
                          )}
                        </div>
                      </div>
                      {it.refType === "custom" && !readOnly && (
                        <div className="mt-2 flex flex-wrap gap-2 pl-[52px]">
                          <Select className="h-10 w-48" value={it.category} onChange={(e) => patch(it.id, { category: e.target.value })} aria-label="Nhóm dịch vụ">
                            {Object.entries(SERVICE_CATEGORIES).filter(([k]) => k !== "package").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </Select>
                          <Select className="h-10 w-40" value={it.basis} onChange={(e) => patch(it.id, { basis: e.target.value as "pax" | "group" })} aria-label="Cách tính">
                            <option value="pax">Tính theo khách</option><option value="group">Tính theo đoàn</option>
                          </Select>
                        </div>
                      )}
                      <span className="sr-only">{qty} đơn vị</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* Cột tổng kết */}
        <aside className="min-w-0">
          <div className="xl:sticky xl:top-6">
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-br from-brand-900 to-brand-800 p-5 text-white sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-400">Báo giá</p>
                <div role="group" aria-label="Chọn loại tiền" className="mt-3 flex flex-wrap gap-1.5">
                  {currencies.map((c) => (
                    <button key={c.code} type="button" aria-pressed={form.currency === c.code} onClick={() => set("currency", c.code)} title={c.name}
                      className={cn("h-9 min-w-12 rounded-full px-3 text-[13px] font-bold transition-colors", form.currency === c.code ? "bg-gold-400 text-brand-950" : "bg-white/10 text-brand-100 hover:bg-white/20")}>
                      {c.label}
                    </button>
                  ))}
                </div>
                <div role="group" aria-label="Cách báo giá" className="mt-3 inline-flex rounded-xl bg-white/10 p-1">
                  {([["total", "Cả tour"], ["perPax", "1 khách"]] as const).map(([k, l]) => (
                    <button key={k} type="button" aria-pressed={form.mode === k} onClick={() => set("mode", k)} className={cn("h-9 rounded-lg px-4 text-sm font-semibold transition-colors", form.mode === k ? "bg-white text-brand-900" : "text-brand-100 hover:bg-white/10")}>{l}</button>
                  ))}
                </div>
                <p className="mt-5 text-sm text-brand-100/90">{form.mode === "total" ? `Tổng cả đoàn · ${totals.heads} khách` : "Giá bình quân mỗi khách"}</p>
                <p className="mt-1 break-words text-[34px] font-extrabold leading-tight tracking-tight" aria-live="polite">{fmtMoney(shown, form.currency, p.rates)}</p>
                {form.currency !== "VND" && <p className="mt-0.5 text-sm text-brand-200/80">≈ {fmtVnd(shown)}</p>}
              </div>

              <div className="space-y-3 p-5 sm:p-6">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-ink-3">Tạm tính</dt><dd className="font-semibold">{fmtMoney(totals.subtotal, form.currency, p.rates)}</dd></div>
                  {staff && !readOnly ? (
                    <div className="flex items-center justify-between gap-3"><dt className="text-ink-3">Giảm giá (VND)</dt><dd><Input type="number" min={0} step={10000} inputMode="numeric" value={form.discountVnd} onChange={(e) => set("discountVnd", Math.max(0, Number(e.target.value)))} className="h-9 w-36 px-2.5 text-right" aria-label="Giảm giá" /></dd></div>
                  ) : form.discountVnd > 0 ? (
                    <div className="flex justify-between gap-3"><dt className="text-ink-3">Giảm giá</dt><dd className="font-semibold text-[#b42318]">− {fmtMoney(form.discountVnd, form.currency, p.rates)}</dd></div>
                  ) : null}
                  <div className="flex justify-between gap-3 border-t border-line pt-2"><dt className="font-semibold">Cả đoàn</dt><dd className="font-extrabold text-brand-700">{fmtMoney(totals.total, form.currency, p.rates)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="font-semibold">Mỗi khách</dt><dd className="font-extrabold text-brand-700">{fmtMoney(totals.perPax, form.currency, p.rates)}</dd></div>
                </dl>

                <details className="rounded-2xl bg-white/60 ring-1 ring-inset ring-line">
                  <summary className="flex min-h-11 list-none items-center justify-between gap-2 px-4 text-sm font-semibold text-brand-700"><span>Quy đổi các loại tiền</span><ChevronDown className="size-4" aria-hidden /></summary>
                  <div className="table-wrap px-2 pb-3">
                    <table className="tbl">
                      <thead><tr><th>Tiền</th><th className="num">Cả đoàn</th><th className="num">1 khách</th></tr></thead>
                      <tbody>
                        {currencies.map((c) => (
                          <tr key={c.code}><td className="font-semibold">{c.label}</td><td className="num">{fmtMoney(totals.total, c.code, p.rates)}</td><td className="num">{fmtMoney(totals.perPax, c.code, p.rates)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="px-2 pt-2 text-xs text-ink-3">Tỷ giá: {Object.entries(p.rates).filter(([k]) => currencies.some((c) => c.code === k)).map(([k, v]) => `1 ${currencyMeta(k).label} = ${new Intl.NumberFormat("vi-VN").format(v)}₫`).join(" · ")}</p>
                  </div>
                </details>

                {readOnly ? (
                  <div className="space-y-2">
                    {q?.bookingId && staff && p.role !== "sale" && <Link href={(q.bookingIds?.length ?? 1) > 1 ? "/bookings" : `/bookings/${q.bookingId}`} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 text-[15px] font-semibold text-white"><CircleCheck className="size-5" aria-hidden /> Xem booking{(q.bookingIds?.length ?? 1) > 1 ? ` (${q.bookingIds?.length} đơn)` : ""}</Link>}
                    {q?.bookingId && p.role === "sale" && <Link href={(q.bookingIds?.length ?? 1) > 1 ? "/bookings" : `/bookings/${q.bookingId}`} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 text-[15px] font-semibold text-white"><CircleCheck className="size-5" aria-hidden /> Xem dịch vụ đã xếp</Link>}
                    {!staff && <p className="flex items-start gap-2 rounded-xl bg-brand-100 px-3.5 py-3 text-sm font-medium text-brand-700"><CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden /> Yêu cầu đặt đã được gửi. Bộ phận điều hành sẽ liên hệ xác nhận với bạn.</p>}
                    <Button variant="secondary" className="w-full" onClick={() => window.print()}><Printer className="size-4" aria-hidden /> In / lưu PDF báo giá</Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button size="lg" className="w-full" disabled={!canSubmit} loading={pending} onClick={onConfirm}>
                      {staff ? <><Check className="size-5" aria-hidden /> Xác nhận đặt dịch vụ</> : <><Send className="size-5" aria-hidden /> Gửi yêu cầu đặt</>}
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="secondary" disabled={!canSubmit} loading={pending} onClick={onSave}><Save className="size-4" aria-hidden /> Lưu nháp</Button>
                      <Button variant="secondary" disabled={!canSubmit} onClick={() => window.print()}><Printer className="size-4" aria-hidden /> In báo giá</Button>
                    </div>
                    {!canSubmit && <p className="text-center text-xs text-ink-3">Nhập tên đoàn và chọn ít nhất 1 dịch vụ để tiếp tục.</p>}
                    {q && <Button variant="danger" size="sm" className="w-full" onClick={onCancel}><Trash2 className="size-4" aria-hidden /> Huỷ báo giá nháp</Button>}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </aside>
      </div>

      <PrintSheet p={p} form={form} items={items} totals={totals} pax={pax} code={q?.code} />
    </>
  );
}

/* ---------- Bản in báo giá (chỉ hiện khi in) ---------- */
function PrintSheet({ p, form, items, totals, pax, code }: {
  p: Props; form: { groupName: string; customerName: string; customerId: string; travelDate: string; adults: number; children: number; infants: number; currency: string; mode: string; note: string };
  items: QuoteItem[]; totals: ReturnType<typeof quoteTotals>; pax: { adults: number; children: number; infants: number; childRatio: number }; code?: string;
}) {
  const cust = p.customers.find((c) => c.id === form.customerId)?.name || form.customerName;
  return (
    <div className="print-only text-ink">
      <div className="flex items-start justify-between border-b-2 border-brand-700 pb-3">
        <div>
          <p className="text-2xl font-extrabold text-brand-700">{p.company.brand}</p>
          <p className="text-xs">{p.company.name}</p>
          <p className="text-xs">{p.company.address} · {p.company.phone} · {p.company.email}</p>
        </div>
        <div className="text-right text-xs"><p className="text-lg font-bold">BÁO GIÁ</p>{code && <p>Mã: {code}</p>}</div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <div><dt className="inline font-semibold">Đoàn / khách: </dt><dd className="inline">{form.groupName}</dd></div>
        {cust && <div><dt className="inline font-semibold">Đối tác: </dt><dd className="inline">{cust}</dd></div>}
        <div><dt className="inline font-semibold">Ngày khởi hành: </dt><dd className="inline">{fmtDate(form.travelDate)}</dd></div>
        <div><dt className="inline font-semibold">Số khách: </dt><dd className="inline">{form.adults} NL, {form.children} TE, {form.infants} EB</dd></div>
        <div><dt className="inline font-semibold">Tiền tệ: </dt><dd className="inline">{currencyMeta(form.currency).label}</dd></div>
      </dl>
      <table className="tbl mt-4">
        <thead><tr><th>Nội dung</th><th className="num">SL</th><th className="num">Đơn giá</th><th className="num">Thành tiền</th></tr></thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td><b>{it.name}</b>{it.components && <div className="text-xs text-ink-3">Gồm: {it.components.map((c) => c.name).join("; ")}</div>}</td>
              <td className="num">{itemQuantity(it, pax)}</td>
              <td className="num">{fmtMoney(it.unitPriceVnd, form.currency, p.rates)}</td>
              <td className="num">{fmtMoney(itemTotal(it, pax), form.currency, p.rates)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 ml-auto w-72 space-y-1 text-sm">
        <p className="flex justify-between"><span>Tổng cả đoàn ({totals.heads} khách)</span><b>{fmtMoney(totals.total, form.currency, p.rates)}</b></p>
        <p className="flex justify-between"><span>Giá bình quân / khách</span><b>{fmtMoney(totals.perPax, form.currency, p.rates)}</b></p>
      </div>
      {form.note && <p className="mt-3 text-sm"><b>Ghi chú:</b> {form.note}</p>}
      <p className="mt-6 text-xs text-ink-3">Báo giá tính theo tỷ giá ngày lập; trẻ em 6–11 tuổi tính {Math.round(p.childRatio * 100)}%, em bé dưới 6 tuổi miễn phí.</p>
    </div>
  );
}
