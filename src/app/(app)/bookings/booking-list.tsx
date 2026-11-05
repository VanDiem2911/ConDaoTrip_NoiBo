"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarCheck, Search } from "lucide-react";
import { Badge, Card, Cover, Empty, Input, Progress, cn } from "@/components/ui";
import { fmtDate, fmtVnd } from "@/lib/money";
import type { Role } from "@/lib/types";
import type { listBookings } from "@/lib/data";

type Row = Awaited<ReturnType<typeof listBookings>>[number];

export function BookingList({ bookings, role }: { bookings: Row[]; role: Role }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "package" | "retail">("all");
  const [when, setWhen] = useState<"all" | "upcoming" | "past">("all");
  const back = role === "operator" || role === "accountant";
  const today = new Date().toISOString().slice(0, 10);
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

  const rows = useMemo(
    () =>
      bookings.filter(
        (b) =>
          (kind === "all" || b.kind === kind) &&
          (when === "all" || (when === "upcoming" ? b.travelDate >= today : b.travelDate < today)) &&
          (!q || norm(`${b.groupName} ${b.code} ${b.customerName} ${b.title}`).includes(norm(q))),
      ),
    [bookings, q, kind, when, today], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const chip = (on: boolean) => cn("h-9 rounded-full px-3.5 text-[13px] font-semibold ring-1 ring-inset transition-colors", on ? "bg-brand-900 text-white ring-brand-900" : "bg-white/70 text-ink-2 ring-line hover:bg-brand-100");

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
        <div className="relative min-w-52 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <Input className="pl-10" placeholder="Tìm đoàn, mã booking, khách…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Tìm booking" />
        </div>
        <div role="group" aria-label="Loại đơn" className="flex flex-wrap gap-2">
          {([["all", "Tất cả"], ["package", "Tour trọn gói"], ["retail", "Dịch vụ lẻ"]] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={chip(kind === k)}>{l}</button>)}
        </div>
        <div role="group" aria-label="Thời gian" className="flex flex-wrap gap-2">
          {([["all", "Mọi lúc"], ["upcoming", "Sắp đi"], ["past", "Đã đi"]] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={when === k} onClick={() => setWhen(k)} className={chip(when === k)}>{l}</button>)}
        </div>
      </div>
      {rows.length === 0 ? (
        <Empty icon={<CalendarCheck className="size-7" />} title="Chưa có booking nào" sub="Booking được tạo khi một báo giá được xác nhận đặt." />
      ) : (
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Đoàn / tour</th><th>Loại</th><th>Ngày đi</th><th className="num">Khách</th><th className="num">Giá trị</th>
                {role !== "customer" && <th>Dịch vụ đã xếp</th>}
                {back && <th className="num">Còn nợ</th>}
                {role === "sale" && <th className="num">Hoa hồng</th>}
                {role !== "customer" && <th>Sale</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link href={`/bookings/${b.id}`} className="group flex min-w-[250px] items-center gap-3">
                      <Cover src={b.cover} className="size-11 shrink-0 rounded-xl" />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink group-hover:text-brand-700">{b.groupName}</span>
                        <span className="block truncate text-xs text-ink-3">{b.code} · {b.customerName}</span>
                      </span>
                    </Link>
                  </td>
                  <td><Badge tone={b.kind === "package" ? "gold" : "sea"}>{b.kind === "package" ? "Trọn gói" : "Dịch vụ lẻ"}</Badge></td>
                  <td className="whitespace-nowrap">{fmtDate(b.travelDate)}</td>
                  <td className="num">{b.adults + b.children + b.infants}</td>
                  <td className="num font-semibold">{fmtVnd(b.sellVnd)}</td>
                  {role !== "customer" && <td><Progress value={b.progress.arranged} max={b.progress.total} label={b.progress.complete ? "Đã xếp đủ" : `${b.progress.arranged}/${b.progress.total}`} tone={b.progress.complete ? "green" : "gold"} /></td>}
                  {back && "owed" in b && <td className="num">{b.owed ? <span className="font-semibold text-[#b42318]">{fmtVnd(b.owed)}</span> : <Badge tone="green">Đã đủ</Badge>}</td>}
                  {role === "sale" && "commission" in b && <td className="num font-semibold text-brand-700">{fmtVnd(b.commission ?? 0)}</td>}
                  {role !== "customer" && <td className="whitespace-nowrap text-ink-2">{b.saleName ?? "—"}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
