"use client";

import { useEffect, useState } from "react";
import { Modal } from "./modal";
import { http, useAction } from "./hooks";
import { Button, Field, Input, Select, Textarea } from "./ui";
import { fmtVnd, todayIso } from "@/lib/money";

export interface PayTarget { id: string; name: string; owed: number }

/** Trả công nợ cho nhà cung cấp -> ghi sổ chi */
export function PaySupplierModal({ target, onClose }: { target: PayTarget | null; onClose: () => void }) {
  const { run, pending } = useAction();
  const [f, setF] = useState({ amountVnd: 0, date: todayIso(), method: "Chuyển khoản", note: "" });
  useEffect(() => { if (target) setF({ amountVnd: target.owed, date: todayIso(), method: "Chuyển khoản", note: "" }); }, [target]);

  async function submit() {
    if (!target) return;
    const r = await run(() => http("POST", `/api/suppliers/${target.id}/payments`, f), "Đã ghi nhận thanh toán NCC");
    if (r) onClose();
  }
  return (
    <Modal open={!!target} onClose={onClose} title="Thanh toán công nợ NCC" sub={target ? `${target.name} · đang nợ ${fmtVnd(target.owed)}` : undefined}
      footer={<><Button variant="secondary" onClick={onClose}>Huỷ</Button><Button loading={pending} disabled={f.amountVnd <= 0} onClick={submit}>Ghi nhận chi</Button></>}>
      <div className="space-y-4">
        <Field label="Số tiền (VND)"><Input type="number" min={0} step={10000} inputMode="numeric" value={f.amountVnd} onChange={(e) => setF({ ...f, amountVnd: Number(e.target.value) })} className="font-bold" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ngày chi"><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Hình thức"><Select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}><option>Chuyển khoản</option><option>Tiền mặt</option></Select></Field>
        </div>
        <Field label="Ghi chú"><Textarea rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}
