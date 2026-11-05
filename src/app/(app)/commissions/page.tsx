import { requireUser } from "@/lib/auth";
import { isBackoffice } from "@/lib/access";
import { col } from "@/lib/db";
import { financeRows, listStaff, redactFinance } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import type { Transaction } from "@/lib/types";
import { CommissionBoard } from "./commission-board";

export const metadata = { title: "Hoa hồng" };

export default async function CommissionsPage() {
  const user = await requireUser(["sale", "operator", "accountant"]);
  const back = isBackoffice(user.role);
  const [raw, staff, paidTx] = await Promise.all([
    financeRows(user),
    listStaff(),
    (await col<Transaction>("transactions")).find({ kind: "commission" }).toArray(),
  ]);
  const rows = redactFinance(raw, user.role).filter((r) => r.rate > 0 || r.saleId);
  const sales = staff.filter((s) => s.role === "sale" && (back || s.id === user.id));
  const paidByUser = new Map<string, number>();
  for (const t of paidTx) if (t.userId) paidByUser.set(t.userId, (paidByUser.get(t.userId) ?? 0) + t.amountVnd);

  const summary = sales.map((s) => {
    const mine = rows.filter((r) => r.saleId === s.id);
    const commission = mine.reduce((a, r) => a + r.commission, 0);
    const paid = paidByUser.get(s.id) ?? 0;
    return {
      id: s.id, name: s.name, rate: s.commissionRate ?? 0, bookings: mine.length,
      revenue: mine.reduce((a, r) => a + r.sell, 0), profit: back ? mine.reduce((a, r) => a + r.profit, 0) : 0,
      commission, paid, remaining: Math.max(0, commission - paid),
    };
  });

  return (
    <>
      <PageHeader title="Hoa hồng" sub={back ? "Hoa hồng từng nhân viên sale, từng đơn dịch vụ lẻ và từng tour trọn gói (tính trên lợi nhuận gộp)." : "Hoa hồng các đơn bạn phụ trách."} />
      <CommissionBoard summary={summary} rows={rows} canPay={back} showProfit={back} />
    </>
  );
}
