import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { isBackoffice } from "@/lib/access";
import { getActiveSuppliers, getBookingDetail, listStaff } from "@/lib/data";
import { BookingDetail } from "./booking-detail";

export const metadata = { title: "Chi tiết booking" };

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(["sale", "operator", "accountant"]);
  const detail = await getBookingDetail(id, user);
  if (!detail) notFound();
  const back = isBackoffice(user.role);
  const [suppliers, staff] = back ? await Promise.all([getActiveSuppliers(), listStaff()]) : [[], []];
  return (
    <>
      <Link href="/bookings" className="mb-4 inline-flex min-h-10 items-center gap-1.5 rounded-lg text-sm font-semibold text-ink-2 hover:text-brand-700">
        <ArrowLeft className="size-4" aria-hidden /> Danh sách booking
      </Link>
      <BookingDetail
        role={user.role}
        booking={detail.booking}
        finance={detail.finance}
        payments={detail.payments}
        suppliers={suppliers}
        sales={staff.filter((s) => s.role === "sale").map((s) => ({ id: s.id, name: s.name, rate: s.commissionRate ?? 0 }))}
      />
    </>
  );
}
