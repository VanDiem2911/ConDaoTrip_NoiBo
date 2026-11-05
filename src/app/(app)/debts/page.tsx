import { requireUser } from "@/lib/auth";
import { BACKOFFICE } from "@/lib/access";
import { financeRows, listSuppliers } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { DebtBoard } from "./debt-board";

export const metadata = { title: "Công nợ" };

export default async function DebtsPage() {
  const user = await requireUser(BACKOFFICE);
  const [rows, suppliers] = await Promise.all([financeRows(user), listSuppliers()]);
  return (
    <>
      <PageHeader title="Công nợ" sub="Công nợ khách hàng (đặt cọc, tạm ứng, còn nợ) và công nợ nhà cung cấp. Đơn sắp đi mà còn nợ sẽ được báo đỏ." />
      <DebtBoard
        rows={rows}
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name, phone: s.phone, cost: s.cost, paid: s.paid, owed: s.owed, lastPaid: s.lastPaid }))}
      />
    </>
  );
}
