import { HomePage } from "@/components/marketing/HomePage";
import { getHomeCoverageStats } from "@/lib/marketing/home-coverage";

export const dynamic = "force-dynamic";

export default async function Page() {
  const stats = await getHomeCoverageStats();
  return <HomePage stats={stats} />;
}
