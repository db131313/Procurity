import { MapViewLazy } from "@/components/app/MapViewLazy";
import { ensureMapDataFresh } from "@/lib/map/ensure-fresh";
import { isDatabaseConfigured } from "@/lib/db/prisma";
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
 */
export default async function MapPage({ searchParams }: Props) {
  const sp = await searchParams;
  const jar = await cookies();
  const city =
    (typeof sp.city === "string" && sp.city.trim()) ||
    jar.get("pc_city")?.value ||
    "nyc";

  after(() => {
    void ensureMapDataFresh().catch((err) =>
      console.warn("[map] background ensureMapDataFresh", err),
    );
  });

  const showDbHint =
    !isDatabaseConfigured() && process.env.NETLIFY === "true";

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
      <MapViewLazy projects={[]} city={city} />
    </main>
  );
}
