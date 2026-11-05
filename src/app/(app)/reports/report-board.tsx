"use client";

import { useMemo, useState } from "react";
import { BarChart, Donut, HBars } from "@/components/charts";
import { CHART } from "@/lib/chart-colors";
import { Card, CardHeader, Select, Stat } from "@/components/ui";
import { CircleDollarSign, TrendingUp, Users, Wallet } from "lucide-react";
import { compactVnd } from "@/lib/money";
import type { FinanceRow } from "@/lib/data";

interface Cash { type: "thu" | "chi"; kind: string; amountVnd: number; date: string }

export function ReportBoard({ fin, cash, topItems }: { fin: FinanceRow[]; cash: Cash[]; topItems: { name: string; revenue: number; count: number; kind: string }[] }) {
  const years = useMemo(() => Array.from(new Set([...fin.map((r) => r.travelDate.slice(0, 4)), String(new Date().getFullYear())])).sort().reverse(), [fin]);
  const [year, setYear] = useState(years[0]);

  const yearRows = fin.filter((r) => r.travelDate.startsWith(year));
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  const monthly = months.map((m) => {
    const rs = yearRows.filter((r) => r.travelDate.startsWith(m));
    const thu = cash.filter((c) => c.type === "thu" && c.date.startsWith(m)).reduce((s, c) => s + c.amountVnd, 0);
    const chi = cash.filter((c) => c.type === "chi" && c.date.startsWith(m)).reduce((s, c) => s + c.amountVnd, 0);
    return { label: `T${Number(m.slice(5))}`, title: `Tháng ${m.slice(5)}/${year}`, revenue: rs.reduce((s, r) => s + r.sell, 0), profit: rs.reduce((s, r) => s + r.profit, 0), thu, chi };
  });

  const revenue = yearRows.reduce((s, r) => s + r.sell, 0);
  const profit = yearRows.reduce((s, r) => s + r.profit, 0);
  const pax = yearRows.reduce((s, r) => s + r.pax, 0);
  const thu = monthly.reduce((s, m) => s + m.thu, 0);
  const chi = monthly.reduce((s, m) => s + m.chi, 0);

  const bySale = Object.values(
    yearRows.reduce<Record<string, { label: string; value: number; profit: number; count: number }>>((a, r) => {
      const k = r.saleName ?? "Chưa gán sale";
      (a[k] ??= { label: k, value: 0, profit: 0, count: 0 });
      a[k].value += r.sell; a[k].profit += r.profit; a[k].count += 1;
      return a;
    }, {}),
  ).sort((a, b) => b.value - a.value);

  const byCustomer = Object.values(
    yearRows.reduce<Record<string, { label: string; value: number; count: number }>>((a, r) => {
      (a[r.customerName] ??= { label: r.customerName, value: 0, count: 0 });
      a[r.customerName].value += r.sell; a[r.customerName].count += 1;
      return a;
    }, {}),
  ).sort((a, b) => b.value - a.value).slice(0, 6);

  const kinds = (["package", "retail"] as const).map((k) => {
    const l = yearRows.filter((r) => r.kind === k);
    return { key: k, name: k === "package" ? "Tour trọn gói" : "Dịch vụ lẻ", value: l.reduce((s, r) => s + r.sell, 0), color: k === "package" ? CHART.green : CHART.gold, sub: `${l.length} đơn · LN ${compactVnd(l.reduce((s, r) => s + r.profit, 0))}` };
  });

  return (
    <>
      <div className="mb-5 flex items-center gap-3">
        <label htmlFor="year" className="text-sm font-semibold text-ink-2">Năm</label>
        <Select id="year" className="h-10 w-32" value={year} onChange={(e) => setYear(e.target.value)}>{years.map((y) => <option key={y}>{y}</option>)}</Select>
      </div>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat tone="green" icon={<CircleDollarSign className="size-7" strokeWidth={1.7} aria-hidden />} value={compactVnd(revenue)} label="Doanh thu" sub={`${yearRows.length} đơn`} />
        <Stat tone="gold" icon={<TrendingUp className="size-7" strokeWidth={1.7} aria-hidden />} value={compactVnd(profit)} label="Lợi nhuận gộp" sub={`Biên ${revenue ? ((profit / revenue) * 100).toFixed(1) : 0}%`} delay={60} />
        <Stat tone="violet" icon={<Users className="size-7" strokeWidth={1.7} aria-hidden />} value={pax} label="Lượt khách" delay={120} />
        <Stat tone="sea" icon={<Wallet className="size-7" strokeWidth={1.7} aria-hidden />} value={compactVnd(thu - chi)} label="Thu − chi thực tế" sub={`Thu ${compactVnd(thu)} · Chi ${compactVnd(chi)}`} delay={180} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Doanh thu & lợi nhuận theo tháng" sub={`Năm ${year} · theo tháng khởi hành`} />
          <div className="p-5 sm:p-6">
            <BarChart title="Doanh thu và lợi nhuận theo tháng" height={260}
              series={[{ key: "revenue", name: "Doanh thu", color: CHART.green }, { key: "profit", name: "Lợi nhuận gộp", color: CHART.blue }]}
              data={monthly.map((m) => ({ label: m.label, title: m.title, values: { revenue: m.revenue, profit: m.profit } }))} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Cơ cấu đơn" sub="Tour trọn gói và dịch vụ lẻ" />
          <div className="p-5 sm:p-6"><Donut title="Cơ cấu doanh thu theo loại đơn" centerLabel={`${yearRows.length} đơn`} slices={kinds} /></div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card><CardHeader title="Thu – chi thực tế theo tháng" /><div className="p-5 sm:p-6">
          <BarChart title="Thu và chi theo tháng" height={220} series={[{ key: "thu", name: "Thu", color: CHART.green }, { key: "chi", name: "Chi", color: CHART.blue }]}
            data={monthly.map((m) => ({ label: m.label, title: m.title, values: { thu: m.thu, chi: m.chi } }))} /></div></Card>
        <Card><CardHeader title="Doanh thu theo nhân viên sale" /><div className="p-5 sm:p-6">{bySale.length ? <HBars rows={bySale.map((s) => ({ label: s.label, value: s.value, sub: `${s.count} đơn · LN ${compactVnd(s.profit)}` }))} /> : <p className="text-sm text-ink-3">Chưa có dữ liệu.</p>}</div></Card>
        <Card><CardHeader title="Khách / đối tác doanh thu cao" /><div className="p-5 sm:p-6">{byCustomer.length ? <HBars color={CHART.gold} rows={byCustomer.map((c) => ({ label: c.label, value: c.value, sub: `${c.count} đơn` }))} /> : <p className="text-sm text-ink-3">Chưa có dữ liệu.</p>}</div></Card>
      </div>

      <Card className="mt-5">
        <CardHeader title="Tour & dịch vụ bán chạy" sub="Doanh thu phân bổ theo từng dòng báo giá, toàn thời gian" />
        <div className="p-5 sm:p-6"><HBars rows={topItems.map((t) => ({ label: t.name, value: t.revenue, sub: `${t.count} lượt đặt · ${t.kind === "package" ? "Trọn gói" : "Lẻ"}` }))} /></div>
      </Card>
      <p className="mt-4 text-xs text-ink-3">Giá trị hiển thị bằng VND. Lợi nhuận tính trên giá vốn của các dịch vụ đã xếp.</p>
    </>
  );
}
