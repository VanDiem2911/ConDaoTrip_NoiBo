import { requireUser } from "@/lib/auth";
import { BACKOFFICE } from "@/lib/access";
import { listSuppliers } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { SupplierBoard } from "./supplier-board";

export const metadata = { title: "Nhà cung cấp" };

export default async function SuppliersPage() {
  await requireUser(BACKOFFICE);
  const suppliers = await listSuppliers();
  return (
    <>
      <PageHeader title="Nhà cung cấp" sub="Đầu mối liên hệ, bảng giá đầu vào và công nợ với từng nhà cung cấp." />
      <SupplierBoard suppliers={suppliers} />
    </>
  );
}
