import { requireUser } from "@/lib/auth";
import { getCatalog } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { CatalogView } from "./catalog-view";

export const metadata = { title: "Tour du lịch" };

export default async function ToursPage() {
  const user = await requireUser();
  const { tours, services } = await getCatalog(user);
  return (
    <>
      <PageHeader
        title="Tour du lịch"
        sub="Danh mục tour & dịch vụ ConDaoTrip. Chọn để đưa thẳng vào báo giá."
      />
      <CatalogView tours={tours} services={services} canEdit={user.role === "operator" || user.role === "accountant"} />
    </>
  );
}
