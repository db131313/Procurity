import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { DashboardClient } from "@/components/DashboardClient";
import { auth } from "@/lib/auth";
import { getTop20Sites } from "@/lib/intel";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const intel = await getTop20Sites();

  return (
    <div className="min-h-screen">
      <Nav solid />
      <DashboardClient
        initial={{ ...intel, plan: session.user.plan }}
        userName={session.user.name || "Rep"}
      />
    </div>
  );
}
