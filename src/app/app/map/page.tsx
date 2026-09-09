import { MapViewLazy } from "@/components/app/MapViewLazy";
import { PersistCityCookie } from "@/components/app/PersistCityCookie";
import { ensureMapDataFresh } from "@/lib/map/ensure-fresh";
import { isDatabaseConfigured } from "@/lib/db/prisma";
import {
  CITY_COOKIE,
  DEFAULT_CITY_ID,
  getPickerCity,
  resolveCityCode,
} from "@/lib/cities/picker";
import { after } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ city?: string }>;
};

/**
 * Map HTML paints immediately — no pin dump, no sync await.
 * Pins load client-side against the live viewport; freshness sync runs in `after()`.
 * Zip allowlists are enforced on `/api/map/pins` (not SSR).
 * `?city=` / `pc_city` select the metro (teaser + signup defaultCity).
 */
export default async function MapPage({ searchParams }: Props) {
  const sp = await searchParams;
  const jar = await cookies();
  const rawCity =
    (typeof sp.city === "string" && sp.city.trim()) ||
    jar.get(CITY_COOKIE)?.value ||
    DEFAULT_CITY_ID;
  const picker = getPickerCity(rawCity);
  const cityCode = resolveCityCode(rawCity) ?? "nyc";
  const defaultCity = picker?.id ?? DEFAULT_CITY_ID;

  after(() => {
    void ensureMapDataFresh().catch((err) =>
      console.warn("[map] background ensureMapDataFresh", err),
    );
  });

  const showDbHint =
    !isDatabaseConfigured() && process.env.NETLIFY === "true";

  return (
    <main className="relative h-full min-h-0 w-full flex-1 overflow-hidden">
      <PersistCityCookie cityId={defaultCity} />
      <div className="pointer-events-none absolute left-3 top-3 z-30 md:left-5 md:top-4">
        <p className="rounded-full border border-line bg-white/95 px-3 py-1.5 text-[11px] font-bold text-ink shadow-sm backdrop-blur">
          {picker?.label ?? cityCode.replace(/_/g, " ")}
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
      <MapViewLazy projects={[]} city={cityCode} />
    </main>
  );
}
