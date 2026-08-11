import { MapViewLazy } from "@/components/app/MapViewLazy";
import { getCurrentUser } from "@/lib/auth/session";
import { listProjects } from "@/lib/db/store";

export default async function MapPage() {
  const user = await getCurrentUser();
  const zipCodes = user?.zipCodes ?? [];
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
          {zipCodes.length
            ? `Zips: ${zipCodes.join(", ")}`
            : "All seed zips · set yours in Settings"}
        </p>
      </div>
      <MapViewLazy projects={mapProjects} zipCodes={zipCodes} />
    </main>
  );
}
