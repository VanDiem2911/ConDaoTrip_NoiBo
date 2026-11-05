"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CircleDollarSign, Download, HandCoins, Percent, TrendingUp, Wallet } from "lucide-react";
import { Badge, Card, CardHeader, Empty, Field, Input, Stat, cn } from "@/components/ui";
import { compactVnd, fmtDate, fmtVnd } from "@/lib/money";
import type { FinanceRow } from "@/lib/data";

export function AccountingBoard({ rows }: { rows: FinanceRow[] }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [kind, setKind] = useState<"all" | "package" | "retail">("all");

  const shown = useMemo(
    () => rows.filter((r) => (kind === "all" || r.kind === kind) && (!from || r.travelDate >= from) && (!to || r.travelDate <= to)),
    [rows, from, to, kind],
  );
  const sum = (f: (r: FinanceRow) => number, list = shown) => list.reduce((s, r) => s + f(r), 0);
  const revenue = sum((r) => r.sell), cost = sum((r) => r.cost), profit = sum((r) => r.profit), comm = sum((r) => r.commission);
  const margin = revenue ? profit / revenue : 0;

  const byKind = (["package", "retail"] as const).map((k) => {
    const l = shown.filter((r) => r.kind === k);
    return { k, count: l.length, revenue: sum((r) => r.sell, l), cost: sum((r) => r.cost, l), profit: sum((r) => r.profit, l), comm: sum((r) => r.commission, l) };
  });

  function exportCsv() {
    const head = ["Mã", "Đoàn", "Loại", "Khách hàng", "Sale", "Ngày đi", "Doanh thu", "Giá vốn", "Lợi nhuận", "Hoa hồng", "Đã thu", "Còn nợ"];
    const lines = shown.map((r) => [r.code, r.groupName, r.kind === "package" ? "Tour trọn gói" : "Dịch vụ lẻ", r.customerName, r.saleName ?? "", r.travelDate, r.sell, r.cost, r.profit, r.commission, r.paid, r.owed]);
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = "﻿" + [head, ...lines].map((l) => l.map(esc).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `ke-toan-noi-bo-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const chip = (on: boolean) => cn("h-9 rounded-full px-3.5 text-[13px] font-semibold ring-1 ring-inset transition-colors", on ? "bg-brand-900 text-white ring-brand-900" : "bg-white/70 text-ink-2 ring-line hover:bg-brand-100");

  return (
    <>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat tone="green" icon={<CircleDollarSign className="size-7" strokeWidth={1.7} aria-hidden />} value={compactVnd(revenue)} label="Doanh thu" sub={fmtVnd(revenue)} />
        <Stat tone="sea" icon={<Wallet className="size-7" strokeWidth={1.7} aria-hidden />} value={compactVnd(cost)} label="Giá vốn đã xếp" sub={fmtVnd(cost)} delay={60} />
        <Stat tone="gold" icon={<TrendingUp className="size-7" strokeWidth={1.7} aria-hidden />} value={compactVnd(profit)} label="Lợi nhuận gộp" sub={`Biên LN ${(margin * 100).toFixed(1)}%`} delay={120} />
        <Stat tone="violet" icon={<HandCoins className="size-7" strokeWidth={1.7} aria-hidden />} value={compactVnd(comm)} label="Hoa hồng" sub={`LN sau hoa hồng ${compactVnd(profit - comm)}`} delay={180} />
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-2">
        {byKind.map((b) => (
          <Card key={b.k} className="p-5">
            <div className="flex items-center justify-between gap-3"><h3 className="font-bold text-ink">{b.k === "package" ? "Tour trọn gói" : "Dịch vụ lẻ"}</h3><Badge tone={b.k === "package" ? "gold" : "sea"}>{b.count} đơn</Badge></div>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><dt className="text-xs text-ink-3">Doanh thu</dt><dd className="font-bold">{compactVnd(b.revenue)}</dd></div>
              <div><dt className="text-xs text-ink-3">Giá vốn</dt><dd className="font-bold">{compactVnd(b.cost)}</dd></div>
              <div><dt className="text-xs text-ink-3">Lợi nhuận</dt><dd className="font-bold text-brand-700">{compactVnd(b.profit)}</dd></div>
              <div><dt className="text-xs text-ink-3">Biên LN</dt><dd className="inline-flex items-center gap-1 font-bold"><Percent className="size-3.5 text-ink-3" aria-hidden />{b.revenue ? ((b.profit / b.revenue) * 100).toFixed(1) : "0"}</dd></div>
            </dl>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Bảng quyết toán từng đơn" sub="Lợi nhuận chỉ chính xác khi các dịch vụ đã xếp đủ (đơn “tạm tính” còn dịch vụ chưa có giá vốn)." action={<button type="button" onClick={exportCsv} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/80 px-3.5 text-sm font-semibold text-ink ring-1 ring-inset ring-line hover:bg-white"><Download className="size-4" aria-hidden /> Xuất CSV</button>} />
        <div className="flex flex-wrap items-end gap-3 px-5 pb-3 pt-4 sm:px-6">
          <Field label="Từ ngày đi" className="w-40"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="Đến ngày" className="w-40"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <div role="group" aria-label="Loại đơn" className="flex flex-wrap gap-2 pb-1.5">
            {([["all", "Tất cả"], ["package", "Tour trọn gói"], ["retail", "Dịch vụ lẻ"]] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={chip(kind === k)}>{l}</button>)}
            {(from || to) && <button type="button" className={chip(false)} onClick={() => { setFrom(""); setTo(""); }}>Xoá lọc ngày</button>}
          </div>
        </div>
        {shown.length === 0 ? <Empty title="Không có đơn trong khoảng này" /> : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Đơn</th><th>Loại</th><th>Ngày đi</th><th className="num">Doanh thu</th><th className="num">Giá vốn</th><th className="num">Lợi nhuận</th><th className="num">Biên</th><th className="num">Hoa hồng</th><th className="num">LN sau HH</th></tr></thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id}>
                    <td><Link href={`/bookings/${r.id}`} className="font-semibold text-ink hover:text-brand-700 hover:underline">{r.groupName}</Link><p className="text-xs text-ink-3">{r.code} · {r.saleName ?? "chưa gán sale"}</p></td>
                    <td><Badge tone={r.kind === "package" ? "gold" : "sea"}>{r.kind === "package" ? "Trọn gói" : "Dịch vụ lẻ"}</Badge></td>
                    <td className="whitespace-nowrap">{fmtDate(r.travelDate)}</td>
                    <td className="num">{fmtVnd(r.sell)}</td>
                    <td className="num">{fmtVnd(r.cost)}</td>
                    <td className="num font-semibold">{fmtVnd(r.profit)}{!r.complete && <Badge tone="slate" className="ml-1.5">tạm tính</Badge>}</td>
                    <td className="num">{(r.margin * 100).toFixed(1)}%</td>
                    <td className="num">{fmtVnd(r.commission)}</td>
                    <td className="num font-bold text-brand-700">{fmtVnd(r.profit - r.commission)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-brand-100/60 font-bold">
                  <td className="rounded-bl-3xl px-3.5 py-3" colSpan={3}>Tổng cộng ({shown.length} đơn)</td>
                  <td className="num px-3.5">{fmtVnd(revenue)}</td><td className="num px-3.5">{fmtVnd(cost)}</td><td className="num px-3.5">{fmtVnd(profit)}</td>
                  <td className="num px-3.5">{(margin * 100).toFixed(1)}%</td><td className="num px-3.5">{fmtVnd(comm)}</td><td className="num px-3.5 text-brand-700">{fmtVnd(profit - comm)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
