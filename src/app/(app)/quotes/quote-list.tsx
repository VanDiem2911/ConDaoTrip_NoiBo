"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Search } from "lucide-react";
import { Badge, Card, Empty, Input, LinkButton, cn } from "@/components/ui";
import { currencyMeta, fmtDate, fmtMoney } from "@/lib/money";
import { quoteTotals } from "@/lib/pricing";
import type { Quote } from "@/lib/types";
import type { S } from "@/lib/data";

const ST = {
  draft: { label: "Nháp", tone: "amber" as const },
  confirmed: { label: "Đã xác nhận", tone: "green" as const },
  cancelled: { label: "Đã huỷ", tone: "slate" as const },
};

export function QuoteList({ quotes, showSale }: { quotes: S<Quote>[]; showSale: boolean }) {
  const [q, setQ] = useState("");
  const [st, setSt] = useState<"all" | keyof typeof ST>("all");
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

  const rows = useMemo(
    () => quotes.filter((x) => (st === "all" || x.status === st) && (!q || norm(`${x.groupName} ${x.customerName} ${x.code}`).includes(norm(q)))),
    [quotes, q, st], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
        <div className="relative min-w-52 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <Input className="pl-10" placeholder="Tìm theo đoàn, khách, mã báo giá…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Tìm báo giá" />
        </div>
        <div role="group" aria-label="Lọc trạng thái" className="flex flex-wrap gap-2">
          {(["all", "draft", "confirmed", "cancelled"] as const).map((k) => (
            <button key={k} type="button" aria-pressed={st === k} onClick={() => setSt(k)}
              className={cn("h-9 rounded-full px-3.5 text-[13px] font-semibold ring-1 ring-inset transition-colors", st === k ? "bg-brand-900 text-white ring-brand-900" : "bg-white/70 text-ink-2 ring-line hover:bg-brand-100")}>
              {k === "all" ? "Tất cả" : ST[k].label}
            </button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? (
        <Empty icon={<FileText className="size-6" />} title="Chưa có báo giá nào" sub="Tạo báo giá đầu tiên cho một đoàn hoặc khách." action={<LinkButton href="/quotes/new">Tạo báo giá</LinkButton>} />
      ) : (
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Mã</th><th>Đoàn / khách</th><th>Ngày đi</th><th className="num">Khách</th><th className="num">Cả đoàn</th><th className="num">1 khách</th>{showSale && <th>Sale</th>}<th>Trạng thái</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const t = quoteTotals(r.items, r, r.discountVnd);
                return (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap text-xs font-semibold text-ink-3">{r.code}</td>
                    <td>
                      <Link href={`/quotes/${r.id}`} className="font-semibold text-ink hover:text-brand-700 hover:underline">{r.groupName}</Link>
                      <p className="text-xs text-ink-3">{r.customerName}</p>
                    </td>
                    <td className="whitespace-nowrap">{fmtDate(r.travelDate)}</td>
                    <td className="num">{t.heads}</td>
                    <td className="num font-semibold">{fmtMoney(t.total, r.currency, r.rates)}{r.currency !== "VND" && <span className="block text-xs font-normal text-ink-3">{currencyMeta(r.currency).label}</span>}</td>
                    <td className="num">{fmtMoney(t.perPax, r.currency, r.rates)}</td>
                    {showSale && <td className="whitespace-nowrap text-ink-2">{r.saleName ?? "—"}</td>}
                    <td><Badge tone={ST[r.status].tone}>{ST[r.status].label}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
