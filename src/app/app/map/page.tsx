import { MapViewLazy } from "@/components/app/MapViewLazy";
import { PersistCityCookie } from "@/components/app/PersistCityCookie";
import { ensureMapDataFresh } from "@/lib/map/ensure-fresh";
import { getCurrentUser } from "@/lib/auth/session";
import { listProjects } from "@/lib/db/store";
import { isDatabaseConfigured } from "@/lib/db/prisma";
import {
  CITY_COOKIE,
  DEFAULT_CITY_ID,
  getPickerCity,
  resolveCityCode,
} from "@/lib/cities/picker";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ city?: string }>;
};

/**
 * Full map for signed-in users.
 * `?city=` selects the city (defaultCity); also read from `pc_city` cookie.
 */
export default async function MapPage({ searchParams }: Props) {
  await getCurrentUser();
  const sp = await searchParams;
  const jar = await cookies();
  const rawCity =
    (typeof sp.city === "string" && sp.city) ||
    jar.get(CITY_COOKIE)?.value ||
    DEFAULT_CITY_ID;
  const picker = getPickerCity(rawCity);
  const cityCode = resolveCityCode(rawCity) ?? "nyc";
  const defaultCity = picker?.id ?? DEFAULT_CITY_ID;

  const freshness = await ensureMapDataFresh();
  const projects = await listProjects({ city: cityCode });

  const mapProjects = projects.map((p) => ({
    id: p.id,
    latitude: p.latitude,
    longitude: p.longitude,
    score: p.score,
    scoreConfidence: p.scoreConfidence,
    tradeScores: p.tradeScores ?? {
      signage: p.score,
      lighting: p.score,
      glass: p.score,
      security: p.score,
      flooring: p.score,
    },
    address: p.address,
    estValueLow: p.estValueLow,
    estValueHigh: p.estValueHigh,
    buyingWindowEstimate: p.buyingWindowEstimate,
    phase: p.phase,
    borough: p.borough,
    updatedAt: p.updatedAt,
    zip: p.zip,
  }));

  const showDbHint =
    !isDatabaseConfigured() &&
    process.env.NETLIFY === "true" &&
    mapProjects.length === 0;

  return (
    <main className="relative h-full min-h-0 w-full flex-1 overflow-hidden">
      <PersistCityCookie cityId={defaultCity} />
      <div className="pointer-events-none absolute left-3 top-3 z-30 md:left-5 md:top-4">
        <p className="rounded-full border border-line bg-white/95 px-3 py-1.5 text-[11px] font-bold text-ink shadow-sm backdrop-blur">
          {picker?.label ?? "Map"} · {mapProjects.length.toLocaleString()} sites
        </p>
      </div>
      {showDbHint && (
        <div className="pointer-events-none absolute left-3 top-12 z-30 max-w-xs md:left-5">
          <p className="rounded-xl border border-amber-200 bg-amber-50/95 px-2.5 py-1.5 text-[11px] font-medium text-amber-950">
            DATABASE_URL is not set — map data cannot persist on Netlify until
            Neon is connected.
          </p>
        </div>
      )}
      {freshness.error && mapProjects.length === 0 && (
        <div className="pointer-events-none absolute left-3 top-12 z-30 max-w-xs md:left-5">
          <p className="rounded-xl border border-amber-200 bg-amber-50/95 px-2.5 py-1.5 text-[11px] font-medium text-amber-950">
            Map data is temporarily unavailable. Retry shortly.
          </p>
        </div>
      )}
      <MapViewLazy projects={mapProjects} />
    </main>
  );
}
