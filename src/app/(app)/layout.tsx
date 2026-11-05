import { AppShell } from "@/components/sidebar";
import { navFor } from "@/lib/access";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <AppShell nav={navFor(user.role)} user={{ name: user.name, email: user.email, role: user.role }}>
      {children}
    </AppShell>
  );
}
