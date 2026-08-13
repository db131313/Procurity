import { MapViewLazy } from "@/components/app/MapViewLazy";
import { getCurrentUser } from "@/lib/auth/session";
import { getSyncMeta, listProjects } from "@/lib/db/store";
import { relativeTime } from "@/lib/format";

export default async function MapPage() {
  // Always citywide — all five boroughs from live DOB store
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
      <div className="pointer-events-none absolute left-3 top-3 z-20 md:left-5 md:top-4">
        <p className="pointer-events-auto rounded-full border border-line bg-white/95 px-3 py-1.5 text-[11px] font-bold text-slate shadow-sm backdrop-blur">
          {sync.lastSyncAt
            ? `Live · ${boroughs.size} boroughs · ${projects.length.toLocaleString()} sites · ${relativeTime(sync.lastSyncAt)}`
            : "Citywide · run DOB sync"}
        </p>
      </div>
      <MapViewLazy projects={mapProjects} />
    </main>
  );
}
