import { HomePage } from "@/components/marketing/HomePage";
import { getSession } from "@/lib/auth/session";
import { getHomeCoverageStats } from "@/lib/marketing/home-coverage";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [stats, session] = await Promise.all([
    getHomeCoverageStats(),
    getSession(),
  ]);
  // Stats kept for optional future use; home overhaul is copy-first.
  return <HomePage stats={stats} isLoggedIn={Boolean(session)} />;
}
