import { requireUser } from "@/lib/auth";
import { isBackoffice, isStaff } from "@/lib/access";
import { getCatalog, getSettings, listCustomers, listStaff } from "@/lib/data";
import { todayIso } from "@/lib/money";
import { PageHeader } from "@/components/ui";
import { QuoteBuilder } from "../quote-builder";

export const metadata = { title: "Báo giá mới" };

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ add?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const [catalog, settings, customers, staff] = await Promise.all([
    getCatalog(user),
    getSettings(),
    isStaff(user.role) ? listCustomers(user) : Promise.resolve([]),
    isBackoffice(user.role) ? listStaff() : Promise.resolve([]),
  ]);
  return (
    <>
      <PageHeader title="Tính giá tour" sub="Mỗi đoàn / khách một báo giá riêng. Chọn dịch vụ, xem giá theo nhiều loại tiền, cả đoàn hoặc từng khách." />
      <QuoteBuilder
        role={user.role}
        userId={user.id}
        tours={catalog.tours}
        services={catalog.services}
        customers={customers.map((c) => ({ id: c.id, name: c.name, saleId: c.saleId }))}
        sales={staff.filter((s) => s.role === "sale").map((s) => ({ id: s.id, name: s.name }))}
        rates={settings.rates}
        childRatio={settings.childRatio}
        company={settings.company}
        presetAdd={sp.add}
        defaultDate={todayIso()}
      />
    </>
  );
}
