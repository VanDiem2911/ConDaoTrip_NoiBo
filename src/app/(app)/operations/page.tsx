import { requireUser } from "@/lib/auth";
import { BACKOFFICE } from "@/lib/access";
import { getOperations } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { OperationsBoard } from "./operations-board";

export const metadata = { title: "Điều hành dịch vụ" };

export default async function OperationsPage() {
  await requireUser(BACKOFFICE);
  const { bookings, suppliers } = await getOperations();
  return (
    <>
      <PageHeader
        title="Điều hành dịch vụ"
        sub="Khi khách xác nhận đặt, dịch vụ hiện ở đây để xếp. Mỗi dòng cho biết thuộc tour trọn gói hay dịch vụ lẻ."
      />
      <OperationsBoard bookings={bookings} suppliers={suppliers} />
    </>
  );
}
