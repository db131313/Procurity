import { NextResponse } from "next/server";
import { PICKER_CITIES } from "@/lib/cities/picker";
import { isValidTeaserCoord } from "@/lib/cities/teaser-bounds";
import { listProjects } from "@/lib/db/store";
import { isCommercialProject } from "@/lib/marketing/commercial";

export const dynamic = "force-dynamic";

const SERVED = PICKER_CITIES.filter((c) => c.served && c.cityCode);

/**
 * Live proof line for the public home page.
 * Counts commercial projects only (residential excluded), cached 5 minutes.
 */
export async function GET() {
  let projectCount = 0;
  const cityIds = new Set<string>();

  for (const city of SERVED) {
    const projects = await listProjects({ city: city.cityCode! });
    for (const p of projects) {
      if (!isValidTeaserCoord(p.latitude, p.longitude, city)) continue;
      if (!isCommercialProject(p.occupancy, p.buildingType, p.jobType)) continue;
      projectCount += 1;
      cityIds.add(city.id);
    }
  }

  return NextResponse.json(
    {
      ok: true,
      projectCount,
      cityCount: cityIds.size || SERVED.length,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
