import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { PageTransition } from "@/components/app/PageTransition";
import { getCurrentUser } from "@/lib/auth/session";
import { needsZipTerritoryPick } from "@/lib/db/types";

const ZIP_GATE_ALLOW = new Set([
  "/app/onboarding",
  "/app/billing",
  "/app/settings",
  "/app/admin/dev-plan",
]);

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const path = (await headers()).get("x-pathname");
  // Only redirect when proxy provided a path (avoids loops if header is missing).
  if (
    needsZipTerritoryPick(user) &&
    path &&
    path.startsWith("/app") &&
    !ZIP_GATE_ALLOW.has(path)
  ) {
    redirect("/app/onboarding");
  }

  return (
    <AppShell>
      <PageTransition>{children}</PageTransition>
    </AppShell>
  );
}
