import { NextResponse } from "next/server";
import { getPickerCity, DEFAULT_CITY_ID } from "@/lib/cities/picker";
import { canAccessLiveDemo } from "@/lib/demo/auth";
import { getLiveDemoProjects } from "@/lib/demo/public-projects";
import { listProjects } from "@/lib/db/store";
import { isCommercialOrNonResidential } from "@/lib/demo/eligibility";
import { isValidTeaserCoord } from "@/lib/cities/teaser-bounds";
import { projectTeaserLabel } from "@/lib/cities/teaser-label";
import { phaseLabel } from "@/lib/demo/eligibility";

export const dynamic = "force-dynamic";

/**
 * Live sales demo — admin or demo-user session required.
 * Contacts masked unless reveal=1 (still server-gated).
 */
export async function GET(request: Request) {
  const access = await canAccessLiveDemo();
  if (!access.ok) {
    return NextResponse.json(
      { ok: false, error: "Live demo requires an admin or demo-user login." },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const cityParam = url.searchParams.get("city") || DEFAULT_CITY_ID;
  const zip = (url.searchParams.get("zip") || "").trim();
  const reveal = url.searchParams.get("reveal") === "1";
  const city = getPickerCity(cityParam);
  const cityId = city?.id || DEFAULT_CITY_ID;

  if (!zip) {
    const projects = await getLiveDemoProjects(cityId, "");
    return NextResponse.json({
      ok: true,
      live: true,
      cityId,
      zip: "",
      projects,
      reveal: false,
    });
  }

  if (!city?.served || !city.cityCode) {
    return NextResponse.json({
      ok: true,
      live: true,
      cityId,
      zip,
      projects: [],
      reveal: false,
    });
  }

  const all = await listProjects({
    city: city.cityCode,
    zipCodes: [zip],
  });

  const projects = all
    .filter((p) => isCommercialOrNonResidential(p))
    .filter((p) => isValidTeaserCoord(p.latitude, p.longitude, city))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((p) => {
      const contact = reveal
        ? [
            p.ownerName ? `Owner · ${p.ownerName}` : null,
            p.gcName ? `GC · ${p.gcName}` : null,
            p.architectName ? `Architect · ${p.architectName}` : null,
            p.architectPhone || p.engineerPhone
              ? `Phone · ${p.architectPhone || p.engineerPhone}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ") || "No contact on file"
        : "Contact on file · masked";

      return {
        id: p.id,
        kind: "real" as const,
        address: p.address
          .replace(/\b(suite|ste|unit|apt|#)\s*[\w-]+/gi, "")
          .replace(/\s{2,}/g, " ")
          .trim(),
        cityId: city.id,
        latitude: p.latitude,
        longitude: p.longitude,
        projectType: projectTeaserLabel(p.jobType, p.occupancy, p.buildingType),
        phase: p.phase,
        phaseLabel: phaseLabel(p.phase),
        score: p.score,
        scoreReasons: (p.scoreReasons.length
          ? p.scoreReasons
          : ["Strong timing for outreach", "Commercial project fit"]
        ).slice(0, 3),
        valueLow: p.estValueLow || 5000,
        valueHigh: p.estValueHigh || 15000,
        contactMasked: contact,
        label: "Live project · sales mode",
      };
    });

  return NextResponse.json({
    ok: true,
    live: true,
    cityId: city.id,
    zip,
    projects,
    reveal,
  });
}
