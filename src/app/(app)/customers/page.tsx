import { requireUser } from "@/lib/auth";
import { BACKOFFICE, isBackoffice } from "@/lib/access";
import { listCustomers, listStaff } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { CustomerBoard } from "./customer-board";

export const metadata = { title: "Khách hàng (CRM)" };

export default async function CustomersPage() {
  const user = await requireUser(BACKOFFICE);
  const [customers, staff] = await Promise.all([listCustomers(user), isBackoffice(user.role) ? listStaff() : Promise.resolve([])]);
  return (
    <>
      <PageHeader title="Khách hàng (CRM)" sub={user.role === "sale" ? "Khách hàng và đại lý do bạn phụ trách." : "Khách lẻ, đại lý và đối tác — theo dõi doanh thu và công nợ từng khách."} />
      <CustomerBoard
        customers={customers}
        showMoney={isBackoffice(user.role)}
        sales={staff.filter((s) => s.role === "sale").map((s) => ({ id: s.id, name: s.name }))}
        canAssign={isBackoffice(user.role)}
      />
    </>
  );
}
