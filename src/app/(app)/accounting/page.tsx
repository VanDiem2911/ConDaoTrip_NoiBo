import { requireUser } from "@/lib/auth";
import { BACKOFFICE } from "@/lib/access";
import { financeRows } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { AccountingBoard } from "./accounting-board";

export const metadata = { title: "Kế toán nội bộ" };

export default async function AccountingPage() {
  const user = await requireUser(BACKOFFICE);
  const rows = await financeRows(user);
  return (
    <>
      <PageHeader title="Kế toán nội bộ" sub="Doanh thu – giá vốn – lợi nhuận gộp – hoa hồng của từng đơn dịch vụ lẻ và từng tour trọn gói." />
      <AccountingBoard rows={rows} />
    </>
  );
}
