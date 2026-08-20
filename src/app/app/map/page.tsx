import { MapViewLazy } from "@/components/app/MapViewLazy";
import { ensureMapDataFresh } from "@/lib/map/ensure-fresh";
import { getCurrentUser } from "@/lib/auth/session";
import { listProjects } from "@/lib/db/store";
import { isDatabaseConfigured } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * Map loads pins automatically: fresh DB data renders immediately;
 * empty / stale (>24h) triggers server-side sync before paint (skeleton via loading.tsx).
 * No user-facing sync button.
 */
export default async function MapPage() {
  await getCurrentUser();
  const freshness = await ensureMapDataFresh();
  const projects = await listProjects();

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
      {showDbHint && (
        <div className="pointer-events-none absolute left-3 top-3 z-30 max-w-xs md:left-5 md:top-4">
          <p className="rounded-xl border border-amber-200 bg-amber-50/95 px-2.5 py-1.5 text-[11px] font-medium text-amber-950 shadow-sm backdrop-blur">
            DATABASE_URL is not set — map data cannot persist on Netlify until
            Neon is connected.
          </p>
        </div>
      )}
      {freshness.error && mapProjects.length === 0 && (
        <div className="pointer-events-none absolute left-3 top-3 z-30 max-w-xs md:left-5 md:top-4">
          <p className="rounded-xl border border-amber-200 bg-amber-50/95 px-2.5 py-1.5 text-[11px] font-medium text-amber-950 shadow-sm backdrop-blur">
            Map data is temporarily unavailable. Retry shortly.
          </p>
        </div>
      )}
      <MapViewLazy projects={mapProjects} />
    </main>
  );
}
