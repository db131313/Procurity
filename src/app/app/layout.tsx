import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { PageTransition } from "@/components/app/PageTransition";
import { getCurrentUser } from "@/lib/auth/session";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AppShell>
      <PageTransition>{children}</PageTransition>
    </AppShell>
  );
}
