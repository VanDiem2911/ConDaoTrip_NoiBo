import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listBookings } from "@/lib/data";
import { LinkButton, PageHeader } from "@/components/ui";
import { BookingList } from "./booking-list";

export const metadata = { title: "Booking & Đặt tour" };

export default async function BookingsPage() {
  const user = await requireUser(["sale", "operator", "accountant"]);
  const bookings = await listBookings(user);
  return (
    <>
      <PageHeader
        title="Booking & Đặt tour"
        sub={user.role === "customer" ? "Các tour và dịch vụ bạn đã đặt." : "Các đơn đã xác nhận — tour trọn gói và dịch vụ lẻ."}
        action={<LinkButton href="/quotes/new"><Plus className="size-4" aria-hidden /> Báo giá mới</LinkButton>}
      />
      <BookingList bookings={bookings} role={user.role} />
    </>
  );
}
