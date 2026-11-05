import { requireUser } from "@/lib/auth";
import { BACKOFFICE } from "@/lib/access";
import { getSettings, listStaff } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { SettingsBoard } from "./settings-board";

export const metadata = { title: "Cài đặt hệ thống" };

export default async function SettingsPage() {
  const user = await requireUser(BACKOFFICE);
  const [settings, staff] = await Promise.all([getSettings(), listStaff()]);
  return (
    <>
      <PageHeader title="Cài đặt hệ thống" sub="Tỷ giá, tham số tính giá, tài khoản nhân viên và phân quyền." />
      <SettingsBoard
        meId={user.id}
        settings={{ rates: settings.rates, defaultCommissionRate: settings.defaultCommissionRate, childRatio: settings.childRatio, company: settings.company }}
        staff={staff.filter((s) => s.role !== "customer").map((s) => ({ id: s.id, name: s.name, email: s.email, role: s.role, phone: s.phone, commissionRate: s.commissionRate, active: s.active }))}
        customerCount={staff.filter((s) => s.role === "customer").length}
      />
    </>
  );
}
