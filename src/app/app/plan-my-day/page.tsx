import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PlanMyDayOrchestrator } from "@/components/app/PlanMyDayOrchestrator";
import { getCurrentUser } from "@/lib/auth/session";
import {
  CITY_COOKIE,
  DEFAULT_CITY_ID,
  resolveCityCode,
} from "@/lib/cities/picker";
import { needsZipTerritoryPick } from "@/lib/db/types";

export const dynamic = "force-dynamic";

/**
 * Agent Plan My Day entry — auto-picks area from account zips / default city,
 * then hands the generated route to the existing map + Start FAB.
 */
export default async function PlanMyDayPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/app/plan-my-day");
  if (needsZipTerritoryPick(user)) redirect("/app/onboarding");

  const jar = await cookies();
  const raw = jar.get(CITY_COOKIE)?.value || DEFAULT_CITY_ID;
  const defaultCity = resolveCityCode(raw) || "nyc";

  return (
    <PlanMyDayOrchestrator
      zipCodes={user.zipCodes ?? []}
      defaultCity={defaultCity}
    />
  );
}
