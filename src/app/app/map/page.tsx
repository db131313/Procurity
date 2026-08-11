import { MapViewLazy } from "@/components/app/MapViewLazy";
import { getCurrentUser } from "@/lib/auth/session";
import { getSyncMeta, listProjects } from "@/lib/db/store";
import { relativeTime } from "@/lib/format";

export default async function MapPage() {
  const user = await getCurrentUser();
  const sync = await getSyncMeta();
  const zipCodes = user?.zipCodes ?? [];
  // Show subscribed zips when set; otherwise citywide live feed
  const projects = await listProjects({
    zipCodes: zipCodes.length ? zipCodes : undefined,
  });

  const mapProjects = projects.map((p) => ({
    id: p.id,
    latitude: p.latitude,
    longitude: p.longitude,
    score: p.score,
    address: p.address,
    estValueLow: p.estValueLow,
    estValueHigh: p.estValueHigh,
    buyingWindowEstimate: p.buyingWindowEstimate,
    phase: p.phase,
    updatedAt: p.updatedAt,
    zip: p.zip,
  }));

  return (
    <main className="relative flex min-h-[100dvh] flex-1 flex-col md:min-h-0">
      <div className="pointer-events-none absolute left-3 top-[4.5rem] z-20 md:left-5 md:top-[5.5rem]">
        <p className="pointer-events-auto rounded-full border border-line bg-white/95 px-3 py-1 text-[11px] font-bold text-slate shadow-sm backdrop-blur">
          {sync.lastSyncAt
            ? `Live · all 5 boroughs · ${projects.length.toLocaleString()} sites · ${relativeTime(sync.lastSyncAt)}`
            : "Citywide · run DOB sync"}
        </p>
      </div>
      <MapViewLazy projects={mapProjects} zipCodes={zipCodes} />
    </main>
  );
}
