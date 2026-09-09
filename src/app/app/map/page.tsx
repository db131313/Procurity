import { MapViewLazy } from "@/components/app/MapViewLazy";
import { ensureMapDataFresh, peekMapFreshness } from "@/lib/map/ensure-fresh";
import { listMapPins } from "@/lib/map/pins";
import { getCurrentUser } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/lib/db/prisma";
import { after } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ city?: string }>;
};

/**
 * Map paints immediately when any pins exist.
 * Freshness sync runs in `after()` so it never blocks the first HTML.
 * Only cold-empty stores await sync before paint.
 */
export default async function MapPage({ searchParams }: Props) {
  await getCurrentUser();
  const sp = await searchParams;
  const jar = await cookies();
  const city =
    (typeof sp.city === "string" && sp.city.trim()) ||
    jar.get("pc_city")?.value ||
    undefined;

  const peek = await peekMapFreshness();

  if (peek.empty) {
    // First-ever load: must sync once so there is something to show.
    await ensureMapDataFresh();
  } else if (peek.stale || peek.missing.length > 0) {
    // Have pins — paint now, refresh in background.
    after(() => {
      void ensureMapDataFresh().catch((err) =>
        console.warn("[map] background ensureMapDataFresh", err),
      );
    });
  }

  const { pins, totalMatched, truncated } = await listMapPins({
    city,
    limit: 2000,
  });

  const mapProjects = pins.map((p) => ({
    id: p.id,
    latitude: p.latitude,
    longitude: p.longitude,
    score: p.score,
    scoreConfidence: p.scoreConfidence,
    tradeScores: p.tradeScores,
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
      {showDbHint && (
        <div className="pointer-events-none absolute left-3 top-3 z-30 max-w-xs md:left-5 md:top-4">
          <p className="rounded-xl border border-amber-200 bg-amber-50/95 px-2.5 py-1.5 text-[11px] font-medium text-amber-950 shadow-sm backdrop-blur">
            DATABASE_URL is not set — map data cannot persist on Netlify until
            Neon is connected.
          </p>
        </div>
      )}
      {city && (
        <div className="pointer-events-none absolute left-3 top-3 z-30 md:left-5 md:top-4">
          <p className="rounded-full border border-line bg-white/95 px-3 py-1.5 text-[11px] font-bold text-ink shadow-sm backdrop-blur">
            {city.replace(/_/g, " ")} · {totalMatched.toLocaleString()}
            {truncated ? "+" : ""} sites
          </p>
        </div>
      )}
      <MapViewLazy projects={mapProjects} city={city} />
    </main>
  );
}
