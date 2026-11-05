import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listQuotes } from "@/lib/data";
import { LinkButton, PageHeader } from "@/components/ui";
import { QuoteList } from "./quote-list";

export const metadata = { title: "Tính giá tour" };

export default async function QuotesPage() {
  const user = await requireUser();
  const quotes = await listQuotes(user);
  return (
    <>
      <PageHeader
        title="Tính giá tour"
        sub="Mỗi đoàn / khách là một báo giá riêng, báo được nhiều loại tiền, cả tour hoặc từng khách."
        action={<LinkButton href="/quotes/new"><Plus className="size-4" aria-hidden /> Tạo báo giá</LinkButton>}
      />
      <QuoteList quotes={quotes} showSale={user.role !== "customer"} />
    </>
  );
}
