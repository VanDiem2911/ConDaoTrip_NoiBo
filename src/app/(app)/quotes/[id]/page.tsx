import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isBackoffice, isStaff } from "@/lib/access";
import { getCatalog, getQuote, getSettings, listCustomerOptions, listStaff } from "@/lib/data";
import { todayIso } from "@/lib/money";
import { PageHeader } from "@/components/ui";
import { QuoteBuilder } from "../quote-builder";

export const metadata = { title: "Báo giá" };

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const quote = await getQuote(id, user);
  if (!quote) notFound();
  const [catalog, settings, customers, staff] = await Promise.all([
    getCatalog(user),
    getSettings(),
    isStaff(user.role) ? listCustomerOptions(user) : Promise.resolve([]),
    isBackoffice(user.role) ? listStaff() : Promise.resolve([]),
  ]);
  const draft = quote.status === "draft";
  return (
    <>
      <PageHeader title={`Báo giá ${quote.code}`} sub={draft ? "Báo giá nháp — chỉnh sửa rồi xác nhận để chuyển cho điều hành." : "Báo giá đã chốt — chỉ xem và in."} />
      <QuoteBuilder
        role={user.role}
        userId={user.id}
        tours={catalog.tours}
        services={catalog.services}
        customers={customers}
        sales={staff.filter((s) => s.role === "sale").map((s) => ({ id: s.id, name: s.name }))}
        rates={draft ? settings.rates : quote.rates}
        childRatio={draft ? settings.childRatio : quote.childRatio}
        company={settings.company}
        quote={quote}
        defaultDate={todayIso()}
      />
    </>
  );
}
