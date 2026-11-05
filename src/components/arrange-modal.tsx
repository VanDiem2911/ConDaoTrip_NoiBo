"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Plus, Undo2 } from "lucide-react";
import { Modal } from "./modal";
import { http, useAction } from "./hooks";
import { Badge, Button, Field, Input, Select, Textarea, cn } from "./ui";
import { fmtVnd } from "@/lib/money";
import { SERVICE_CATEGORIES, type BookingLine, type Supplier } from "@/lib/types";
import type { S } from "@/lib/data";

export type SupplierOpt = S<Supplier>;

export interface ArrangeTarget {
  bookingId: string;
  bookingCode: string;
  groupName: string;
  line: BookingLine;
}

/** Điều hành xếp 1 dịch vụ: chọn NCC → bảng giá đầu vào (hoặc nhập tay) → thông tin đã xếp. Thêm NCC mới ngay tại đây. */
export function ArrangeModal({
  target, suppliers: initial, onClose,
}: { target: ArrangeTarget | null; suppliers: SupplierOpt[]; onClose: () => void }) {
  const { run, pending } = useAction();
  const line = target?.line;

  const [suppliers, setSuppliers] = useState(initial);
  const [supplierId, setSupplierId] = useState("");
  const [allSuppliers, setAllSuppliers] = useState(false);
  const [priceId, setPriceId] = useState("");
  const [qty, setQty] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [total, setTotal] = useState(0);
  const [info, setInfo] = useState("");
  const [adding, setAdding] = useState(false);
  const [nw, setNw] = useState({ name: "", phone: "", contactName: "" });

  useEffect(() => setSuppliers(initial), [initial]);
  useEffect(() => {
    if (!line) return;
    setSupplierId(line.supplierId ?? "");
    setPriceId("");
    setQty(line.qty);
    setTotal(line.costVnd ?? 0);
    setUnitCost(line.costVnd && line.qty ? Math.round(line.costVnd / line.qty) : 0);
    setInfo(line.arrangeInfo ?? "");
    setAdding(false);
    setAllSuppliers(false);
    setNw({ name: "", phone: "", contactName: "" });
  }, [line?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const matching = useMemo(
    () => (line ? suppliers.filter((s) => s.categories.includes(line.category)) : []),
    [suppliers, line],
  );
  const list = allSuppliers || matching.length === 0 ? suppliers : matching;
  const supplier = suppliers.find((s) => s.id === supplierId);
  const options = supplier ? [...supplier.prices.filter((x) => x.category === line?.category), ...supplier.prices.filter((x) => x.category !== line?.category)] : [];

  function pickPrice(id: string) {
    setPriceId(id);
    const pr = options.find((x) => x.id === id);
    if (!pr) return;
    setUnitCost(pr.costVnd);
    setTotal(Math.round(pr.costVnd * qty));
    setInfo((cur) => cur || `${pr.name} · ${qty} ${line?.unit ?? ""}`.trim());
  }
  const changeQty = (v: number) => { setQty(v); setTotal(Math.round(unitCost * v)); };
  const changeUnit = (v: number) => { setUnitCost(v); setTotal(Math.round(v * qty)); };

  async function addSupplier() {
    const r = await run(
      () => http<{ supplier: SupplierOpt }>("POST", "/api/suppliers", { ...nw, category: line?.category }),
      "Đã thêm nhà cung cấp mới", { refresh: false },
    );
    if (r?.supplier) {
      setSuppliers((l) => [...l, r.supplier]);
      setSupplierId(r.supplier.id);
      setAdding(false);
      setNw({ name: "", phone: "", contactName: "" });
    }
  }

  async function save() {
    if (!target || !line) return;
    const r = await run(
      () => http("PATCH", `/api/bookings/${target.bookingId}/lines/${line.id}`, { supplierId: supplierId || undefined, costVnd: total, arrangeInfo: info }),
      "Đã xếp dịch vụ",
    );
    if (r) onClose();
  }
  async function undo() {
    if (!target || !line) return;
    const r = await run(() => http("PATCH", `/api/bookings/${target.bookingId}/lines/${line.id}`, { unarrange: true }), "Đã chuyển về chờ xếp");
    if (r) onClose();
  }

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      side
      title={line?.status === "arranged" ? "Sửa dịch vụ đã xếp" : "Xếp dịch vụ"}
      sub={target ? `${target.bookingCode} · ${target.groupName}` : undefined}
      footer={
        <>
          {line?.status === "arranged" && <Button variant="danger" className="mr-auto" loading={pending} onClick={undo}><Undo2 className="size-4" aria-hidden /> Bỏ xếp</Button>}
          <Button variant="secondary" onClick={onClose}>Đóng</Button>
          <Button loading={pending} onClick={save} disabled={!supplierId && !info.trim()}><Check className="size-4" aria-hidden /> Lưu: đã xếp</Button>
        </>
      }
    >
      {line && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-inset ring-line">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={line.origin === "package" ? "gold" : "sea"}>{line.origin === "package" ? "Thuộc tour trọn gói" : "Dịch vụ lẻ"}</Badge>
              <Badge tone="slate">{SERVICE_CATEGORIES[line.category] ?? line.category}</Badge>
            </div>
            <p className="mt-2 text-[15px] font-bold text-ink">{line.name}</p>
            <p className="mt-0.5 text-sm text-ink-3">
              Cần xếp: <b className="text-ink-2">{line.qty} {line.unit}</b>
              {line.tourName && <> · thuộc <b className="text-ink-2">{line.tourName}</b></>}
            </p>
          </div>

          <Field label="Nhà cung cấp">
            <Select value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setPriceId(""); }}>
              <option value="">— Chưa chọn / tự thực hiện —</option>
              {list.map((s) => <option key={s.id} value={s.id}>{s.name}{s.phone ? ` · ${s.phone}` : ""}</option>)}
            </Select>
          </Field>
          <div className="-mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
            {matching.length > 0 && (
              <label className="inline-flex min-h-8 items-center gap-2 text-ink-2">
                <input type="checkbox" className="size-4 accent-brand-600" checked={allSuppliers} onChange={(e) => setAllSuppliers(e.target.checked)} /> Hiện tất cả NCC
              </label>
            )}
            <button type="button" onClick={() => setAdding((v) => !v)} className="inline-flex min-h-8 items-center gap-1 font-semibold text-brand-700 hover:underline">
              <Plus className="size-4" aria-hidden /> Thêm nhà cung cấp mới
            </button>
          </div>

          {adding && (
            <div className="anim-pop space-y-3 rounded-2xl bg-brand-50 p-4 ring-1 ring-inset ring-brand-200">
              <p className="text-sm font-semibold text-brand-700">Nhà cung cấp mới — chỉ cần tên, bổ sung sau</p>
              <Field label="Tên nhà cung cấp *"><Input value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value })} autoFocus /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Số điện thoại"><Input inputMode="tel" value={nw.phone} onChange={(e) => setNw({ ...nw, phone: e.target.value })} /></Field>
                <Field label="Người liên hệ"><Input value={nw.contactName} onChange={(e) => setNw({ ...nw, contactName: e.target.value })} /></Field>
              </div>
              <Button size="sm" loading={pending} disabled={!nw.name.trim()} onClick={addSupplier}>Lưu & chọn NCC này</Button>
            </div>
          )}

          {supplier && options.length > 0 && (
            <fieldset>
              <legend className="mb-1.5 text-[13px] font-semibold text-ink-2">Giá đầu vào của {supplier.name}</legend>
              <div className="space-y-1.5">
                {options.map((o) => (
                  <label key={o.id} className={cn("flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2 ring-1 ring-inset transition-colors", priceId === o.id ? "bg-brand-100 ring-brand-500" : "bg-white/70 ring-line hover:bg-brand-50")}>
                    <input type="radio" name="price" className="size-4 accent-brand-600" checked={priceId === o.id} onChange={() => pickPrice(o.id)} />
                    <span className="min-w-0 flex-1 text-sm font-medium text-ink">{o.name}<span className="block text-xs font-normal text-ink-3">{SERVICE_CATEGORIES[o.category] ?? o.category}</span></span>
                    <span className="shrink-0 text-sm font-bold text-brand-700">{fmtVnd(o.costVnd)}<span className="text-xs font-normal text-ink-3">/{o.unit}</span></span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Số lượng"><Input type="number" min={0} step={0.5} inputMode="decimal" value={qty} onChange={(e) => changeQty(Number(e.target.value))} /></Field>
            <Field label="Đơn giá vốn (VND)"><Input type="number" min={0} step={1000} inputMode="numeric" value={unitCost} onChange={(e) => changeUnit(Number(e.target.value))} /></Field>
            <Field label="Giá vốn tổng (VND)" hint="Có thể nhập tay"><Input type="number" min={0} step={1000} inputMode="numeric" value={total} onChange={(e) => setTotal(Number(e.target.value))} className="font-bold" /></Field>
          </div>

          <Field label="Thông tin dịch vụ đã xếp" hint="Sale sẽ thấy nội dung này (vd: tên nhà hàng, giờ đón, số phòng…).">
            <Textarea rows={4} value={info} onChange={(e) => setInfo(e.target.value)} placeholder="VD: Nhà hàng Bến Đầm, set menu 150k/suất, 12:00 ngày 10/11, liên hệ chị Hoa 0903…" />
          </Field>
        </div>
      )}
    </Modal>
  );
}
