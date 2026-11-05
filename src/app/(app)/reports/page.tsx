import { requireUser } from "@/lib/auth";
import { BACKOFFICE } from "@/lib/access";
import { getReportData } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { ReportBoard } from "./report-board";

export const metadata = { title: "Báo cáo thống kê" };

export default async function ReportsPage() {
  await requireUser(BACKOFFICE);
  const data = await getReportData();
  return (
    <>
      <PageHeader title="Báo cáo thống kê" sub="Doanh thu, lợi nhuận, cơ cấu đơn, nhân viên và tour bán chạy." />
      <ReportBoard fin={data.fin} cash={data.cash} topItems={data.topItems} />
    </>
  );
}
