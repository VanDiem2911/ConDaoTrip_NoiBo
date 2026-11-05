import Link from "next/link";
import {
  BriefcaseBusiness, CalendarClock, CircleDollarSign, ClipboardList, HandCoins, PiggyBank, Plus, TrendingUp,
  TriangleAlert, Users, Wallet,
} from "lucide-react";
import { BarChart, Donut } from "@/components/charts";
import { CHART } from "@/lib/chart-colors";
import { Badge, Card, CardHeader, Cover, Empty, LinkButton, PageHeader, Progress, Stat } from "@/components/ui";
import { isBackoffice } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { getCatalog, getDashboard, listQuotes } from "@/lib/data";
import { compactVnd, fmtDate, fmtNum, fmtVnd } from "@/lib/money";
import { ROLE_LABEL } from "@/lib/types";

export const metadata = { title: "Tổng quan" };

export default async function DashboardPage() {
  const user = await requireUser();

  // Khách hàng / đối tác: chỉ chọn dịch vụ và xem báo giá — không có số liệu vận hành
  if (user.role === "customer") {
    const [quotes, { tours, services }] = await Promise.all([listQuotes(user), getCatalog(user)]);
    return (
      <>
        <PageHeader title="Xin chào" sub={`${user.name} · chọn dịch vụ theo yêu cầu, xem báo giá và gửi yêu cầu đặt.`} action={<LinkButton href="/quotes/new"><Plus className="size-4" aria-hidden /> Tạo báo giá</LinkButton>} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat tone="sea" icon={<BriefcaseBusiness className="size-7" strokeWidth={1.7} aria-hidden />} value={fmtNum(tours.length + services.length)} label="Tour & dịch vụ có thể chọn" />
          <Stat delay={60} tone="gold" icon={<PiggyBank className="size-7" strokeWidth={1.7} aria-hidden />} value={fmtNum(quotes.filter((q) => q.status === "draft").length)} label="Báo giá nháp" />
          <Stat delay={120} tone="green" icon={<CalendarClock className="size-7" strokeWidth={1.7} aria-hidden />} value={fmtNum(quotes.filter((q) => q.status === "confirmed").length)} label="Yêu cầu đã gửi" />
        </div>
        <Card className="anim-up mt-5 overflow-hidden" style={{ animationDelay: "120ms" }}>
          <CardHeader title="Báo giá gần đây" action={<LinkButton href="/quotes" variant="ghost" size="sm">Tất cả báo giá</LinkButton>} />
          {quotes.length === 0 ? (
            <Empty title="Chưa có báo giá nào" sub="Chọn tour hoặc dịch vụ để nhận báo giá ngay." action={<LinkButton href="/tours">Xem tour du lịch</LinkButton>} />
          ) : (
            <ul className="divide-y divide-line/70 px-5 pb-3 pt-3 sm:px-6">
              {quotes.slice(0, 6).map((q) => (
                <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <Link href={`/quotes/${q.id}`} className="font-semibold text-ink hover:text-brand-700 hover:underline">{q.groupName}</Link>
                    <p className="text-xs text-ink-3">{q.code} · đi {fmtDate(q.travelDate)}</p>
                  </div>
                  <Badge tone={q.status === "confirmed" ? "green" : q.status === "draft" ? "amber" : "slate"}>{q.status === "confirmed" ? "Đã gửi yêu cầu" : q.status === "draft" ? "Nháp" : "Đã huỷ"}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </>
    );
  }

  const d = await getDashboard(user);
  const back = isBackoffice(user.role);
  const sale = user.role === "sale";
  const k = d.kpi;

  const series = [{ key: "revenue", name: "Doanh thu", color: CHART.green }, ...(back ? [{ key: "profit", name: "Lợi nhuận gộp", color: CHART.blue }] : sale ? [{ key: "commission", name: "Hoa hồng dự kiến", color: CHART.gold }] : [])];

  return (
    <>
      <PageHeader
        title="Tổng quan hệ thống"
        sub={`Xin chào ${user.name} · ${ROLE_LABEL[user.role]}. Số liệu tính trên các đơn đã xác nhận${sale ? " do bạn phụ trách" : ""}.`}
        action={<LinkButton href="/quotes/new"><Plus className="size-4" aria-hidden /> Tạo báo giá</LinkButton>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat delay={0} tone="sea" icon={<BriefcaseBusiness className="size-7" strokeWidth={1.7} aria-hidden />} value={fmtNum(k.openTours)} label="Tour đang mở" />
        <Stat delay={60} tone="violet" icon={<Users className="size-7" strokeWidth={1.7} aria-hidden />} value={fmtNum(k.pax)} label="Lượt khách" sub={`${k.bookings} booking`} />
        {<Stat delay={120} tone="green" icon={<CircleDollarSign className="size-7" strokeWidth={1.7} aria-hidden />} value={compactVnd(k.revenue)} label="Doanh thu đã chốt" sub={fmtVnd(k.revenue)} />}
        {back && <Stat delay={180} tone="gold" icon={<TrendingUp className="size-7" strokeWidth={1.7} aria-hidden />} value={compactVnd(k.profit)} label="Lợi nhuận gộp" sub="Doanh thu − giá vốn đã xếp" />}
        {back && <Stat delay={240} tone="red" icon={<Wallet className="size-7" strokeWidth={1.7} aria-hidden />} value={compactVnd(k.owed)} label="Khách còn nợ" sub={`${k.owedCount} đơn · ${k.overdueCount} cần nhắc`} />}
        {back && <Stat delay={300} tone="sea" icon={<ClipboardList className="size-7" strokeWidth={1.7} aria-hidden />} value={fmtNum(k.pendingLines)} label="Dịch vụ chờ xếp" sub="Đơn đã xác nhận" />}
        {sale && <Stat delay={180} tone="gold" icon={<HandCoins className="size-7" strokeWidth={1.7} aria-hidden />} value={compactVnd(k.commission)} label="Hoa hồng dự kiến" sub="Theo đơn bạn phụ trách" />}
        {sale && <Stat delay={240} tone="red" icon={<PiggyBank className="size-7" strokeWidth={1.7} aria-hidden />} value={fmtNum(k.draftQuotes)} label="Báo giá nháp" sub="Chưa xác nhận đặt" />}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        {(
          <Card className="anim-up" style={{ animationDelay: "120ms" }}>
            <CardHeader title="Doanh thu theo tháng" sub="Theo tháng khởi hành của đơn đã xác nhận" />
            <div className="p-5 sm:p-6">
              <BarChart
                title="Doanh thu theo tháng"
                series={series}
                data={d.series.map((m) => ({ label: m.label, title: `Tháng ${m.key.slice(5)}/${m.key.slice(0, 4)}`, values: { revenue: m.revenue, profit: m.profit, commission: m.commission } }))}
              />
            </div>
          </Card>
        )}

        {back ? (
          <Card className="anim-up" style={{ animationDelay: "180ms" }}>
            <CardHeader title="Cơ cấu doanh thu" sub="Tour trọn gói và dịch vụ lẻ" />
            <div className="p-5 sm:p-6">
              <Donut
                title="Cơ cấu doanh thu theo loại đơn"
                centerLabel={`${d.byKind.reduce((s, x) => s + x.count, 0)} đơn`}
                slices={d.byKind.map((x) => ({
                  key: x.kind, name: x.kind === "package" ? "Tour trọn gói" : "Dịch vụ lẻ", value: x.revenue,
                  color: x.kind === "package" ? CHART.green : CHART.gold, sub: `${x.count} đơn · LN ${compactVnd(x.profit)}`,
                }))}
              />
            </div>
          </Card>
        ) : (
          <Card className="anim-up flex flex-col justify-center" style={{ animationDelay: "180ms" }}>
            <Empty
              icon={<CalendarClock className="size-7" aria-hidden />}
              title="Tạo báo giá cho đoàn mới"
              sub="Mỗi đoàn / khách một báo giá riêng, xem giá theo VND, USD, RMB… cho cả đoàn hoặc từng khách."
              action={<LinkButton href="/quotes/new">Bắt đầu báo giá</LinkButton>}
            />
          </Card>
        )}
      </div>

      {back && d.alerts.length > 0 && (
        <Card className="anim-up mt-5 border-[#f8c9c9]" style={{ animationDelay: "220ms" }}>
          <CardHeader
            title={<span className="inline-flex items-center gap-2 text-[#b42318]"><TriangleAlert className="size-5" aria-hidden /> Nhắc công nợ khách hàng</span>}
            sub="Đơn còn nợ, khởi hành trong vòng 7 ngày hoặc đã qua ngày đi"
            action={<LinkButton href="/debts" variant="secondary" size="sm">Xem công nợ</LinkButton>}
          />
          <ul className="divide-y divide-line/70 px-5 pb-3 pt-3 sm:px-6">
            {d.alerts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <Link href={`/bookings/${a.id}`} className="font-semibold text-ink hover:text-brand-700 hover:underline">{a.groupName}</Link>
                  <p className="text-xs text-ink-3">{a.code} · {a.customerName} · đi {fmtDate(a.travelDate)} {a.daysToTravel < 0 ? `(đã qua ${-a.daysToTravel} ngày)` : `(còn ${a.daysToTravel} ngày)`}</p>
                </div>
                <Badge tone="red">Còn nợ {fmtVnd(a.owed)}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="anim-up mt-5 overflow-hidden" style={{ animationDelay: "260ms" }}>
        <CardHeader title="Tour sắp khởi hành" action={<LinkButton href="/bookings" variant="ghost" size="sm">Tất cả booking</LinkButton>} />
        {d.upcoming.length === 0 ? (
          <Empty title="Chưa có đoàn nào sắp khởi hành" sub="Xác nhận một báo giá để tạo booking." />
        ) : (
          <div className="table-wrap mt-3">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Tour</th><th>Ngày khởi hành</th><th className="num">Số khách</th>
                  <th>Đã xếp dịch vụ</th>
                </tr>
              </thead>
              <tbody>
                {d.upcoming.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <Link href={`/bookings/${u.id}`} className="group flex min-w-[260px] items-center gap-3">
                        <Cover src={u.cover} w={128} className="size-12 shrink-0 rounded-xl" />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-ink group-hover:text-brand-700">{u.title}</span>
                          <span className="block truncate text-xs text-ink-3">{u.groupName}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="whitespace-nowrap font-semibold">{fmtDate(u.travelDate)}</td>
                    <td className="num">{u.pax}</td>
                    <td>
                      <Progress value={u.progress.arranged} max={u.progress.total} label={u.progress.complete ? "Đã xếp đủ" : `${u.progress.arranged}/${u.progress.total} dịch vụ`} tone={u.progress.complete ? "green" : "gold"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
