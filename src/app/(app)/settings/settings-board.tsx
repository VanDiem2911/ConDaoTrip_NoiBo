"use client";

import { useState } from "react";
import { Lock, Plus, ShieldCheck } from "lucide-react";
import { http, useAction } from "@/components/hooks";
import { Modal } from "@/components/modal";
import { Avatar, Badge, Button, Card, CardHeader, Field, Input, Select } from "@/components/ui";
import { CURRENCIES, currencyMeta } from "@/lib/money";
import { ROLE_LABEL, type Role } from "@/lib/types";

interface Staff { id: string; name: string; email: string; role: Role; phone?: string; commissionRate?: number; active: boolean }

const PERMS: { role: Role; can: string[]; cannot: string[] }[] = [
  { role: "customer", can: ["Chọn dịch vụ theo yêu cầu", "Xem báo giá, gửi yêu cầu đặt"], cannot: ["Sắp xếp / nhà cung cấp", "Giá vốn, lợi nhuận, công nợ", "Mọi mục quản trị khác"] },
  { role: "sale", can: ["Chọn dịch vụ, báo giá", "Biết dịch vụ đã xếp chưa và thông tin đã xếp", "Hoa hồng đơn mình phụ trách"], cannot: ["Giá vốn, lợi nhuận", "Công nợ, thu – chi, nhà cung cấp, CRM"] },
  { role: "operator", can: ["Tất cả tính năng", "Xếp dịch vụ, nhà cung cấp, công nợ", "Kế toán, báo cáo, cài đặt"], cannot: [] },
  { role: "accountant", can: ["Tất cả tính năng như Điều hành"], cannot: [] },
];

export function SettingsBoard({ meId, settings, staff, customerCount }: {
  meId: string; settings: { rates: Record<string, number>; defaultCommissionRate: number; childRatio: number; company: { name: string; brand: string; phone: string; email: string; address: string; taxCode: string } };
  staff: Staff[]; customerCount: number;
}) {
  const { run, pending } = useAction();
  const [rates, setRates] = useState<Record<string, number>>(settings.rates);
  const [comm, setComm] = useState(settings.defaultCommissionRate);
  const [child, setChild] = useState(settings.childRatio * 100);
  const [open, setOpen] = useState(false);
  const [u, setU] = useState({ name: "", email: "", password: "", role: "sale", phone: "", commissionRate: 10 });

  const foreign = CURRENCIES.filter((c) => c.code !== "VND");

  async function saveParams() {
    await run(() => http("PUT", "/api/settings", { rates, defaultCommissionRate: comm, childRatio: child / 100 }), "Đã lưu cài đặt. Báo giá nháp mới sẽ dùng tỷ giá này.");
  }
  async function addUser() {
    const r = await run(() => http("POST", "/api/users", u), "Đã tạo tài khoản");
    if (r) { setOpen(false); setU({ name: "", email: "", password: "", role: "sale", phone: "", commissionRate: 10 }); }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader title="Tỷ giá & tham số báo giá" sub="Tỷ giá = số VND cho 1 đơn vị ngoại tệ. Báo giá đã xác nhận giữ nguyên tỷ giá lúc lập." />
        <div className="space-y-4 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {foreign.map((c) => (
              <Field key={c.code} label={`1 ${c.label} = … VND`} hint={c.name}>
                <Input type="number" min={0} step={c.code === "KRW" ? 0.1 : 10} inputMode="decimal" value={rates[c.code] ?? ""} onChange={(e) => setRates({ ...rates, [c.code]: Number(e.target.value) })} />
              </Field>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="% hoa hồng mặc định (sale mới)" hint="Tính trên lợi nhuận gộp"><Input type="number" min={0} max={100} step={0.5} value={comm} onChange={(e) => setComm(Number(e.target.value))} /></Field>
            <Field label="Giá trẻ em 6–11 tuổi (% giá người lớn)"><Input type="number" min={0} max={100} step={5} value={child} onChange={(e) => setChild(Number(e.target.value))} /></Field>
          </div>
          <Button loading={pending} onClick={saveParams}>Lưu cài đặt</Button>
          <p className="text-xs text-ink-3">Các loại tiền đang bật: VND, {foreign.map((c) => currencyMeta(c.code).label).join(", ")}.</p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Thông tin công ty" />
        <dl className="space-y-2.5 p-5 text-sm sm:p-6">
          <div><dt className="text-ink-3">Tên pháp nhân</dt><dd className="font-semibold">{settings.company.name}</dd></div>
          <div><dt className="text-ink-3">Thương hiệu</dt><dd className="font-semibold">{settings.company.brand}</dd></div>
          <div><dt className="text-ink-3">Địa chỉ</dt><dd className="font-semibold">{settings.company.address}</dd></div>
          <div className="grid grid-cols-2 gap-3"><div><dt className="text-ink-3">Điện thoại</dt><dd className="font-semibold">{settings.company.phone}</dd></div><div><dt className="text-ink-3">MST</dt><dd className="font-semibold">{settings.company.taxCode}</dd></div></div>
          <div><dt className="text-ink-3">Email</dt><dd className="font-semibold">{settings.company.email}</dd></div>
          <p className="pt-2 text-xs text-ink-3">Hiển thị trên bản in báo giá. Khách hàng / đối tác đã đăng ký: {customerCount}.</p>
        </dl>
      </Card>

      <Card className="xl:col-span-2 overflow-hidden">
        <CardHeader title="Nhân viên & phân quyền" sub="Tài khoản nội bộ. Khách hàng tự đăng ký ở trang đăng nhập." action={<Button onClick={() => setOpen(true)}><Plus className="size-4" aria-hidden /> Thêm nhân viên</Button>} />
        <div className="table-wrap mt-4">
          <table className="tbl">
            <thead><tr><th>Nhân viên</th><th>Vai trò</th><th>Email</th><th className="num">% hoa hồng</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td><div className="flex items-center gap-3"><Avatar name={s.name} /><div><p className="font-semibold text-ink">{s.name}</p>{s.phone && <p className="text-xs text-ink-3">{s.phone}</p>}</div></div></td>
                  <td><Badge tone={s.role === "sale" ? "sea" : "green"} icon={<ShieldCheck className="size-3.5" aria-hidden />}>{ROLE_LABEL[s.role]}</Badge></td>
                  <td>{s.email}</td>
                  <td className="num">{s.role === "sale" ? (
                    <Input aria-label={`% hoa hồng ${s.name}`} type="number" min={0} max={100} step={0.5} defaultValue={s.commissionRate ?? 0} className="ml-auto h-9 w-24 text-right"
                      onBlur={(e) => { const v = Number(e.target.value); if (v !== (s.commissionRate ?? 0)) run(() => http("PATCH", `/api/users/${s.id}`, { commissionRate: v }), "Đã cập nhật % hoa hồng"); }} />
                  ) : "—"}</td>
                  <td>{s.id === meId ? <Badge tone="slate" icon={<Lock className="size-3.5" aria-hidden />}>Bạn</Badge> : (
                    <Button size="sm" variant={s.active ? "secondary" : "primary"} onClick={() => run(() => http("PATCH", `/api/users/${s.id}`, { active: !s.active }), s.active ? "Đã khoá tài khoản" : "Đã mở khoá")}>{s.active ? "Đang hoạt động · Khoá" : "Đã khoá · Mở"}</Button>
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 border-t border-line/70 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
          {PERMS.map((p) => (
            <div key={p.role} className="rounded-2xl bg-white/60 p-4 ring-1 ring-inset ring-line">
              <p className="font-bold text-ink">{ROLE_LABEL[p.role]}</p>
              <ul className="mt-2 space-y-1 text-[13px] text-ink-2">{p.can.map((c) => <li key={c} className="flex gap-1.5"><span className="text-brand-600" aria-hidden>✓</span>{c}</li>)}</ul>
              {p.cannot.length > 0 && <ul className="mt-2 space-y-1 text-[13px] text-ink-3">{p.cannot.map((c) => <li key={c} className="flex gap-1.5"><span className="text-[#b42318]" aria-hidden>✕</span>{c}</li>)}</ul>}
            </div>
          ))}
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Thêm nhân viên" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Huỷ</Button><Button loading={pending} disabled={!u.name || !u.email || u.password.length < 8} onClick={addUser}>Tạo tài khoản</Button></>}>
        <div className="space-y-4">
          <Field label="Họ tên *"><Input value={u.name} onChange={(e) => setU({ ...u, name: e.target.value })} autoFocus /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Vai trò"><Select value={u.role} onChange={(e) => setU({ ...u, role: e.target.value })}><option value="sale">Sale</option><option value="operator">Điều hành</option><option value="accountant">Kế toán</option></Select></Field>
            <Field label="Số điện thoại"><Input inputMode="tel" value={u.phone} onChange={(e) => setU({ ...u, phone: e.target.value })} /></Field>
          </div>
          <Field label="Email đăng nhập *"><Input type="email" value={u.email} onChange={(e) => setU({ ...u, email: e.target.value })} /></Field>
          <Field label="Mật khẩu tạm *" hint="Tối thiểu 8 ký tự"><Input type="password" value={u.password} onChange={(e) => setU({ ...u, password: e.target.value })} autoComplete="new-password" /></Field>
          {u.role === "sale" && <Field label="% hoa hồng trên lợi nhuận"><Input type="number" min={0} max={100} step={0.5} value={u.commissionRate} onChange={(e) => setU({ ...u, commissionRate: Number(e.target.value) })} /></Field>}
        </div>
      </Modal>
    </div>
  );
}
