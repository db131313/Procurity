import { NextResponse } from "next/server";
import { PICKER_CITIES } from "@/lib/cities/picker";
import { isValidTeaserCoord } from "@/lib/cities/teaser-bounds";
import { projectTeaserLabel } from "@/lib/cities/teaser-label";
import { listProjects } from "@/lib/db/store";
import { ensureMapDataFresh } from "@/lib/map/ensure-fresh";

export const dynamic = "force-dynamic";

const SERVED = PICKER_CITIES.filter((c) => c.served && c.cityCode);

/**
 * Public home map pin feed — ALL projects for every served city.
 * Only fields needed to draw + filter. No address/contacts/filings.
 * Cached 5 minutes. Sync is non-blocking.
 */
export async function GET() {
  void ensureMapDataFresh().catch(() => {});

  const byCity: Record<
    string,
    { totalCount: number; pinCount: number }
  > = {};
  const pins: Array<{
    id: string;
    city: string;
    latitude: number;
    longitude: number;
    phase: string;
    score: number;
    tradeScores: {
      signage: number;
      lighting: number;
      glass: number;
      security: number;
      flooring: number;
    };
    projectType: string;
    updatedAt: string | null;
  }> = [];

  // Sequential — file-backed store is not safe under concurrent listProjects.
  for (const city of SERVED) {
    const projects = await listProjects({ city: city.cityCode! });
    const valid = projects.filter((p) =>
      isValidTeaserCoord(p.latitude, p.longitude, city),
    );
    byCity[city.id] = { totalCount: valid.length, pinCount: valid.length };
    for (const p of valid) {
      const trades = p.tradeScores ?? {
        signage: p.score,
        lighting: p.score,
        glass: p.score,
        security: p.score,
        flooring: p.score,
      };
      pins.push({
        id: p.id,
        city: city.id,
        latitude: p.latitude,
        longitude: p.longitude,
        phase: p.phase,
        score: p.score,
        tradeScores: {
          signage: trades.signage ?? 0,
          lighting: trades.lighting ?? 0,
          glass: trades.glass ?? 0,
          security: trades.security ?? 0,
          flooring: trades.flooring ?? 0,
        },
        projectType: projectTeaserLabel(
          p.jobType,
          p.occupancy,
          p.buildingType,
        ),
        updatedAt: p.updatedAt ?? p.lastActivityAt ?? null,
      });
    }
  }

  return NextResponse.json(
    {
      ok: true,
      cities: SERVED.map((c) => c.id),
      byCity,
      pins,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
