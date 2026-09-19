import { cookies } from "next/headers";
import { RoutePlanner } from "@/components/app/RoutePlanner";
import {
  CITY_COOKIE,
  DEFAULT_CITY_ID,
  resolveCityCode,
} from "@/lib/cities/picker";

export const dynamic = "force-dynamic";

export default async function RoutePage() {
  const jar = await cookies();
  const raw = jar.get(CITY_COOKIE)?.value || DEFAULT_CITY_ID;
  const city = resolveCityCode(raw) || "nyc";

  return (
    <main>
      <RoutePlanner defaultCity={city} />
    </main>
  );
}
