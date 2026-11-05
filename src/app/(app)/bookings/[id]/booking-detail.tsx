"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleCheck, ClipboardList, HandCoins, Pencil, Plus, Wrench } from "lucide-react";
import { ArrangeModal, type ArrangeTarget, type SupplierOpt } from "@/components/arrange-modal";
import { http, useAction } from "@/components/hooks";
import { Modal } from "@/components/modal";
import { CategoryGlyph } from "@/components/nav-icon";
import { Badge, Button, Card, CardHeader, Cover, Empty, Field, Input, Progress, Select, Textarea } from "@/components/ui";
import { daysLabel } from "@/lib/ui-format";
import { fmtDate, fmtVnd, todayIso } from "@/lib/money";
import { SERVICE_CATEGORIES, TX_KIND_LABEL, type Booking, type Role, type Transaction } from "@/lib/types";
import type { S } from "@/lib/data";

type Fin = { cost?: number; profit?: number; margin?: number; commission: number; arranged: number; total: number; complete: boolean; paid?: number; deposit?: number; advance?: number; owed?: number } | null;

export function BookingDetail({
  role, booking: b, finance, payments, suppliers, sales,
}: {
  role: Role; booking: S<Booking>; finance: Fin; payments: S<Transaction>[]; suppliers: SupplierOpt[]; sales: { id: string; name: string; rate: number }[];
}) {
  const back = role === "operator" || role === "accountant";
  const isSale = role === "sale";
  const isCustomer = role === "customer";
  const { run, pending } = useAction();
  const [target, setTarget] = useState<ArrangeTarget | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [pay, setPay] = useState({ kind: "payment", amountVnd: 0, date: todayIso(), method: "Chuyển khoản", note: "" });
  const [saleId, setSaleId] = useState(b.saleId ?? "");
  const [rate, setRate] = useState(b.commissionRate);

  const live = target ? (() => { const l = b.lines.find((x) => x.id === target.line.id); return l ? { ...target, line: l } : null; })() : null;
  const heads = b.adults + b.children + b.infants;

  async function submitPay() {
    const r = await run(() => http("POST", `/api/bookings/${b.id}/payments`, pay), "Đã ghi nhận thanh toán");
    if (r) setPayOpen(false);
  }
  async function saveOwner() {
    await run(() => http("PATCH", `/api/bookings/${b.id}`, { saleId: saleId || undefined, commissionRate: rate }), "Đã cập nhật sale & hoa hồng");
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-[260px_1fr]">
          <Cover src={b.cover} w={640} priority className="h-44 w-full md:h-full" />
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={b.kind === "package" ? "gold" : "sea"}>{b.kind === "package" ? "Tour trọn gói" : "Dịch vụ lẻ"}</Badge>
              <Badge tone={b.status === "confirmed" ? "green" : "slate"}>{b.status === "confirmed" ? "Đã xác nhận" : "Đã huỷ"}</Badge>
              <span className="text-xs font-semibold text-ink-3">{b.code}</span>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">{b.groupName}</h1>
            <p className="text-sm text-ink-3">{b.title}</p>
            <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-ink-3">Khách hàng</dt><dd className="font-semibold">{b.customerName}</dd></div>
              <div><dt className="text-ink-3">Ngày khởi hành</dt><dd className="font-semibold">{fmtDate(b.travelDate)} <span className="font-normal text-ink-3">· {daysLabel(b.travelDate)}</span></dd></div>
              <div><dt className="text-ink-3">Số khách</dt><dd className="font-semibold">{b.adults} NL · {b.children} TE · {b.infants} EB ({heads})</dd></div>
              <div><dt className="text-ink-3">Giá trị đơn</dt><dd className="text-lg font-extrabold text-brand-700">{fmtVnd(b.sellVnd)}</dd></div>
              {!isCustomer && <div><dt className="text-ink-3">Sale phụ trách</dt><dd className="font-semibold">{b.saleName ?? "—"}</dd></div>}
              {b.discountVnd > 0 && <div><dt className="text-ink-3">Đã giảm</dt><dd className="font-semibold">{fmtVnd(b.discountVnd)}</dd></div>}
            </dl>
            <div className="mt-4"><Link href={`/quotes/${b.quoteId}`} className="text-sm font-semibold text-brand-700 hover:underline">Xem báo giá gốc →</Link></div>
          </div>
        </div>
      </Card>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        {/* Dịch vụ & sắp xếp */}
        <Card className="min-w-0 overflow-hidden">
          {isCustomer ? (
            <>
              <CardHeader title="Dịch vụ bạn đã đặt" />
              <ul className="divide-y divide-line/70 px-6 pb-4 pt-2">
                {b.items.map((it) => (
                  <li key={it.id} className="flex items-start gap-3 py-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-600"><CategoryGlyph category={it.category} /></span>
                    <div className="min-w-0"><p className="font-semibold text-ink">{it.name}</p>
                      {it.components && <p className="mt-0.5 text-xs text-ink-3">Gồm: {it.components.map((c) => c.name).join("; ")}</p>}</div>
                  </li>
                ))}
              </ul>
              <p className="border-t border-line/70 px-6 py-4 text-sm text-ink-3">Chúng tôi sẽ liên hệ xác nhận chi tiết dịch vụ trước ngày khởi hành.</p>
            </>
          ) : (
            <>
              <CardHeader
                title="Dịch vụ & trạng thái sắp xếp"
                sub={finance ? `Đã xếp ${finance.arranged}/${finance.total} dịch vụ` : undefined}
                action={finance && <div className="w-40"><Progress value={finance.arranged} max={finance.total} label={finance.complete ? "Đã xếp đủ" : "Đang xếp"} tone={finance.complete ? "green" : "gold"} /></div>}
              />
              <div className="table-wrap mt-3">
                <table className="tbl">
                  <thead><tr><th>Dịch vụ</th><th>Nguồn</th><th className="num">SL</th><th>Trạng thái</th><th>NCC / thông tin đã xếp</th>{back && <th className="num">Giá vốn</th>}{back && <th><span className="sr-only">Thao tác</span></th>}</tr></thead>
                  <tbody>
                    {b.lines.map((l) => (
                      <tr key={l.id}>
                        <td><div className="flex min-w-[200px] items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-600"><CategoryGlyph category={l.category} className="size-[18px]" /></span><div><p className="font-semibold text-ink">{l.name}</p><p className="text-xs text-ink-3">{SERVICE_CATEGORIES[l.category] ?? l.category}</p></div></div></td>
                        <td>{l.origin === "package" ? <div><Badge tone="gold">Trọn gói</Badge><p className="mt-0.5 max-w-[150px] truncate text-xs text-ink-3" title={l.tourName}>{l.tourName}</p></div> : <Badge tone="sea">Dịch vụ lẻ</Badge>}</td>
                        <td className="num">{l.qty} <span className="text-xs text-ink-3">{l.unit}</span></td>
                        <td>{l.status === "arranged" ? <Badge tone="green" icon={<CircleCheck className="size-3.5" aria-hidden />}>Đã xếp</Badge> : <Badge tone="amber" icon={<ClipboardList className="size-3.5" aria-hidden />}>Chờ xếp</Badge>}</td>
                        <td className="max-w-[280px]">{l.status === "arranged" ? <><p className="truncate font-medium" title={l.supplierName}>{l.supplierName ?? "Tự thực hiện"}</p><p className="whitespace-normal text-xs text-ink-3">{l.arrangeInfo || "—"}</p></> : <span className="text-ink-3">Chưa xếp</span>}</td>
                        {back && <td className="num font-semibold">{l.status === "arranged" ? fmtVnd(l.costVnd ?? 0) : "—"}</td>}
                        {back && <td className="num"><Button size="sm" variant={l.status === "pending" ? "primary" : "secondary"} onClick={() => setTarget({ bookingId: b.id, bookingCode: b.code, groupName: b.groupName, line: l })} aria-label={`${l.status === "pending" ? "Xếp" : "Sửa"} ${l.name}`}>{l.status === "pending" ? <><Wrench className="size-4" aria-hidden /> Xếp</> : <><Pencil className="size-4" aria-hidden /> Sửa</>}</Button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>

        {/* Cột phải */}
        <div className="min-w-0 space-y-5">
          {back && finance && (
            <Card>
              <CardHeader title="Doanh thu – lợi nhuận" sub={finance.complete ? undefined : "Tạm tính: còn dịch vụ chưa xếp (chưa có giá vốn)"} />
              <dl className="space-y-2.5 p-5 text-sm sm:p-6">
                <Row k="Doanh thu" v={fmtVnd(b.sellVnd)} />
                <Row k="Giá vốn đã xếp" v={fmtVnd(finance.cost ?? 0)} />
                <div className="flex justify-between gap-3 border-t border-line pt-2.5"><dt className="font-semibold">Lợi nhuận gộp</dt><dd className="text-lg font-extrabold text-brand-700">{fmtVnd(finance.profit ?? 0)} <span className="text-xs font-semibold text-ink-3">({Math.round((finance.margin ?? 0) * 100)}%)</span></dd></div>
                <Row k={`Hoa hồng ${b.commissionRate}% · ${b.saleName ?? "chưa gán sale"}`} v={fmtVnd(finance.commission)} />
              </dl>
              <div className="space-y-3 border-t border-line/70 p-5 sm:p-6">
                <Field label="Sale phụ trách">
                  <Select value={saleId} onChange={(e) => { setSaleId(e.target.value); const s = sales.find((x) => x.id === e.target.value); if (s) setRate(s.rate); }}>
                    <option value="">— Chưa gán —</option>
                    {sales.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                </Field>
                <Field label="% hoa hồng trên lợi nhuận"><Input type="number" min={0} max={100} step={0.5} value={rate} onChange={(e) => setRate(Number(e.target.value))} /></Field>
                <Button variant="secondary" size="sm" loading={pending} onClick={saveOwner} disabled={saleId === (b.saleId ?? "") && rate === b.commissionRate}>Lưu</Button>
              </div>
            </Card>
          )}

          {isSale && finance && (
            <Card>
              <CardHeader title="Hoa hồng đơn này" />
              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-4">
                  <span className="grid size-14 place-items-center rounded-2xl bg-gold-100 text-gold-700"><HandCoins className="size-7" aria-hidden /></span>
                  <div><p className="text-2xl font-extrabold text-brand-700">{fmtVnd(finance.commission)}</p><p className="text-sm text-ink-3">{b.commissionRate}% lợi nhuận gộp{finance.complete ? "" : " · tạm tính, còn dịch vụ chưa xếp"}</p></div>
                </div>
              </div>
            </Card>
          )}

          {back && finance && (
            <Card>
              <CardHeader title="Thanh toán của khách" action={<Button size="sm" onClick={() => { setPay({ ...pay, amountVnd: finance.owed ?? 0 }); setPayOpen(true); }}><Plus className="size-4" aria-hidden /> Ghi nhận</Button>} />
              <div className="space-y-3 p-5 sm:p-6">
                <div className="flex items-center justify-between rounded-2xl bg-white/70 p-4 ring-1 ring-inset ring-line">
                  <div><p className="text-xs text-ink-3">Còn phải thu</p><p className={`text-xl font-extrabold ${(finance.owed ?? 0) > 0 ? "text-[#b42318]" : "text-brand-700"}`}>{fmtVnd(finance.owed ?? 0)}</p></div>
                  <Badge tone={(finance.owed ?? 0) === 0 ? "green" : (finance.paid ?? 0) > 0 ? "amber" : "red"}>{(finance.owed ?? 0) === 0 ? "Đã thanh toán" : (finance.paid ?? 0) > 0 ? "Còn nợ" : "Chưa thanh toán"}</Badge>
                </div>
                <dl className="space-y-1.5 text-sm">
                  <Row k="Đã đặt cọc" v={fmtVnd(finance.deposit ?? 0)} />
                  <Row k="Đã tạm ứng" v={fmtVnd(finance.advance ?? 0)} />
                  <Row k="Tổng đã thu" v={fmtVnd(finance.paid ?? 0)} bold />
                </dl>
                {payments.length === 0 ? <Empty title="Chưa có khoản thu" /> : (
                  <ul className="divide-y divide-line/70 text-sm">
                    {payments.map((t) => (
                      <li key={t.id} className="flex items-start justify-between gap-3 py-2.5">
                        <div className="min-w-0"><p className="font-semibold text-ink">{TX_KIND_LABEL[t.kind]}</p><p className="text-xs text-ink-3">{fmtDate(t.date)} · {t.method}{t.note ? ` · ${t.note}` : ""}</p></div>
                        <span className="shrink-0 font-bold text-brand-700">+{fmtVnd(t.amountVnd)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      <ArrangeModal target={live} suppliers={suppliers} onClose={() => setTarget(null)} />

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Ghi nhận khách thanh toán" sub={`${b.code} · còn phải thu ${fmtVnd(finance?.owed ?? 0)}`}
        footer={<><Button variant="secondary" onClick={() => setPayOpen(false)}>Huỷ</Button><Button loading={pending} disabled={pay.amountVnd <= 0} onClick={submitPay}>Ghi nhận</Button></>}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Loại khoản thu"><Select value={pay.kind} onChange={(e) => setPay({ ...pay, kind: e.target.value })}><option value="deposit">Đặt cọc</option><option value="advance">Tạm ứng</option><option value="payment">Thanh toán</option></Select></Field>
            <Field label="Ngày thu"><Input type="date" value={pay.date} onChange={(e) => setPay({ ...pay, date: e.target.value })} /></Field>
          </div>
          <Field label="Số tiền (VND)"><Input type="number" min={0} step={10000} inputMode="numeric" value={pay.amountVnd} onChange={(e) => setPay({ ...pay, amountVnd: Number(e.target.value) })} className="font-bold" /></Field>
          <Field label="Hình thức"><Select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}><option>Chuyển khoản</option><option>Tiền mặt</option><option>Thẻ / cổng thanh toán</option></Select></Field>
          <Field label="Ghi chú"><Textarea rows={2} value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} /></Field>
        </div>
      </Modal>
    </>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return <div className="flex justify-between gap-3"><dt className="text-ink-3">{k}</dt><dd className={bold ? "font-bold" : "font-semibold"}>{v}</dd></div>;
}
