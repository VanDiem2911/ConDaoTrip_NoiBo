import { requireUser } from "@/lib/auth";
import { BACKOFFICE } from "@/lib/access";
import { col, ser } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import type { Transaction } from "@/lib/types";
import { CashBoard } from "./cash-board";

export const metadata = { title: "Thu - Chi" };

export default async function CashbookPage() {
  await requireUser(BACKOFFICE);
  const txs = (await (await col<Transaction>("transactions")).find({}).sort({ date: -1, createdAt: -1 }).limit(1000).toArray()).map(ser);
  return (
    <>
      <PageHeader title="Thu - Chi" sub="Sổ quỹ: tiền khách thanh toán, trả nhà cung cấp, chi hoa hồng và chi phí vận hành." />
      <CashBoard txs={txs} canDelete />
    </>
  );
}
