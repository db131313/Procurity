import { getPickerCity } from "@/lib/cities/picker";
import { projectTeaserLabel } from "@/lib/cities/teaser-label";
import { isValidTeaserCoord } from "@/lib/cities/teaser-bounds";
import { listProjects } from "@/lib/db/store";
import type { Project } from "@/lib/db/types";
import {
  isCommercialOrNonResidential,
  isPublicDemoEligible,
  phaseLabel,
} from "./eligibility";
import { sampleProjectsForCity } from "./samples";
import type { DemoProject } from "./types";

const MAX_REAL = 12;
const MIN_TOTAL = 6;

function streetAddressOnly(address: string): string {
  // Keep street + city/state if present; strip suite/unit detail
  return address
    .replace(/\b(suite|ste|unit|apt|#)\s*[\w-]+/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function plainReasons(reasons: string[]): string[] {
  return (reasons.length ? reasons : [
    "Timing and project type look like a good outreach moment",
    "Commercial project size fits typical signage scope",
  ]).slice(0, 3);
}

function toDemoProject(p: Project, cityId: string): DemoProject {
  return {
    id: p.id,
    kind: "real",
    address: streetAddressOnly(p.address),
    cityId,
    latitude: p.latitude,
    longitude: p.longitude,
    projectType: projectTeaserLabel(p.jobType, p.occupancy, p.buildingType),
    phase: p.phase,
    phaseLabel: phaseLabel(p.phase),
    score: p.score,
    scoreReasons: plainReasons(p.scoreReasons),
    valueLow: p.estValueLow || 5000,
    valueHigh: p.estValueHigh || Math.max(p.estValueLow || 5000, 15000),
    contactMasked: "Contact on file · masked",
    label: "Real example · past the buying window",
  };
}

/**
 * Public demo projects for a city: up to 12 eligible real (past window),
 * topped up with clearly labeled samples if fewer than 6.
 */
export async function getPublicDemoProjects(cityId: string): Promise<{
  cityId: string;
  realCount: number;
  sampleCount: number;
  projects: DemoProject[];
}> {
  const city = getPickerCity(cityId);
  if (!city?.served || !city.cityCode) {
    const samples = sampleProjectsForCity(cityId || "nyc", MIN_TOTAL);
    return {
      cityId: cityId || "nyc",
      realCount: 0,
      sampleCount: samples.length,
      projects: samples,
    };
  }

  const all = await listProjects({ city: city.cityCode });
  const eligible = all
    .filter((p) => isPublicDemoEligible(p))
    .filter((p) => isValidTeaserCoord(p.latitude, p.longitude, city))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_REAL)
    .map((p) => toDemoProject(p, city.id));

  let samples: DemoProject[] = [];
  if (eligible.length < MIN_TOTAL) {
    samples = sampleProjectsForCity(city.id, MIN_TOTAL - eligible.length);
  }

  return {
    cityId: city.id,
    realCount: eligible.length,
    sampleCount: samples.length,
    projects: [...eligible, ...samples],
  };
}

/**
 * Live sales mode: fresh projects in a zip (contacts still masked unless revealed).
 * Caller must enforce admin / demo-user session.
 */
export async function getLiveDemoProjects(
  cityId: string,
  zip: string,
): Promise<DemoProject[]> {
  const city = getPickerCity(cityId);
  if (!city?.served || !city.cityCode) return [];
  const zipClean = zip.trim().slice(0, 10);
  const all = await listProjects({
    city: city.cityCode,
    zipCodes: zipClean ? [zipClean] : undefined,
  });
  return all
    .filter((p) => isCommercialOrNonResidential(p))
    .filter((p) => isValidTeaserCoord(p.latitude, p.longitude, city))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_REAL)
    .map((p) => ({
      ...toDemoProject(p, city.id),
      kind: "real" as const,
      label: "Live project · sales mode",
      contactMasked: "Contact on file · masked",
    }));
}
