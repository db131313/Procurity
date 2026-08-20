import { MapViewLazy } from "@/components/app/MapViewLazy";
import { SyncMapButton } from "@/components/app/SyncMapButton";
import { getCurrentUser } from "@/lib/auth/session";
import { getSyncMeta, listProjects } from "@/lib/db/store";
import { isDatabaseConfigured } from "@/lib/db/prisma";

export default async function MapPage() {
  await getCurrentUser();
  const sync = await getSyncMeta();
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

  const boroughs = new Set(
    projects.map((p) => p.borough).filter(Boolean) as string[],
  );

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden md:h-full md:min-h-0 md:flex-1">
      <div className="absolute left-3 top-3 z-20 md:left-5 md:top-4">
        <SyncMapButton
          lastSyncAt={sync.lastSyncAt}
          projectCount={projects.length}
          boroughCount={boroughs.size}
        />
        {!isDatabaseConfigured() && (
          <p className="pointer-events-auto mt-1.5 max-w-xs rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-950">
            DATABASE_URL is not set — map data cannot persist on Netlify until
            Neon is connected.
          </p>
        )}
      </div>
      <MapViewLazy projects={mapProjects} />
    </main>
  );
}
