import {
  fetchClassicJobCandidates,
  fetchDobNowCandidates,
  fetchPhonesByBins,
} from "./nyc-dob";
import { rankTopSites, scoreFiling } from "./scoring";
import type { ScoredSite, Top20Response } from "./types";

const FALLBACK_SITES: ScoredSite[] = [
  {
    id: "demo-1",
    rank: 1,
    address: "11 Water Street",
    borough: "Manhattan",
    latitude: 40.7032,
    longitude: -74.0128,
    jobType: "New Building",
    filingStatus: "Permit Entire",
    buildingType: "Other",
    jobDescription:
      "New mixed-use tower with retail base — exterior identity package likely near facade close-in.",
    initialCost: 42000000,
    floorArea: 185000,
    stories: 28,
    filingDate: "2024-11-12T00:00:00.000",
    firstPermitDate: "2025-01-08T00:00:00.000",
    currentStatusDate: "2026-07-01T00:00:00.000",
    bin: "1000001",
    nta: "Financial District-Battery Park City",
    signWork: false,
    probabilityScore: 91,
    windowLabel: "Hot — visit today",
    windowReason: [
      "New Building — primary exterior/identity sign opportunity",
      "Permit Entire — active procurement window",
      "High construction value increases sign budget likelihood",
    ],
    contact: {
      ownerName: "Alex Rivera",
      ownerBusiness: "Harborline Development LLC",
      ownerType: "Corporation",
      applicantName: "Morgan Chen",
      applicantBusiness: "Chen + Partners Architects",
      applicantTitle: "RA",
      filingRepName: "Jamie Ortiz",
      filingRepBusiness: "Metro Expediting",
      phone: "(212) 555-0148",
      addressLine: "120 Broadway, New York, NY 10271",
    },
    source: "nyc-dob-now",
  },
];

export async function getTop20Sites(options?: {
  borough?: string | null;
  limit?: number;
}): Promise<Top20Response> {
  const limit = options?.limit ?? 20;
  const borough = options?.borough?.trim() || null;

  try {
    const [dobNow, classic] = await Promise.all([
      fetchDobNowCandidates({ limit: 500, borough }).catch(() => []),
      fetchClassicJobCandidates({ limit: 500, borough }).catch(() => []),
    ]);

    // Prefer DOB NOW rows when BINs collide — fresher modern filings.
    const byBin = new Map<string, (typeof dobNow)[number]>();
    for (const row of classic) {
      const key = row.bin || row.job_filing_number || "";
      if (key) byBin.set(key, row);
    }
    for (const row of dobNow) {
      const key = row.bin || row.job_filing_number || "";
      if (key) byBin.set(key, row);
    }
    const filings = byBin.size > 0 ? [...byBin.values()] : [...dobNow, ...classic];

    const bins = filings.map((f) => f.bin ?? "").filter(Boolean);
    const phones = await fetchPhonesByBins(bins);

    const scored = filings
      .map((f) => {
        const site = scoreFiling(f, phones);
        if (!site) return null;
        const fromClassic = String(f.job_filing_number || "").startsWith("BIS-");
        return {
          ...site,
          source: fromClassic ? ("nyc-dob-jobs" as const) : ("nyc-dob-now" as const),
        };
      })
      .filter((s): s is ScoredSite => Boolean(s));

    const sites = rankTopSites(scored, limit);

    if (sites.length === 0) {
      return {
        generatedAt: new Date().toISOString(),
        count: 0,
        boroughFilter: borough,
        sites: [],
        dataSource:
          "NYC Open Data — DOB NOW (w9ak-ipjd) + DOB Job Application Filings (ic3t-wcy2)",
        note: borough
          ? `No scored procurement-window matches in ${borough} right now. Try All NYC.`
          : "Live filings returned no scored matches.",
      };
    }

    const usedNow = sites.some((s) => s.source === "nyc-dob-now");
    const usedClassic = sites.some((s) => s.source === "nyc-dob-jobs");
    const dataSource = [
      usedNow ? "DOB NOW Build Job Filings (w9ak-ipjd)" : null,
      usedClassic ? "DOB Job Application Filings (ic3t-wcy2)" : null,
    ]
      .filter(Boolean)
      .join(" + ");

    return {
      generatedAt: new Date().toISOString(),
      count: sites.length,
      boroughFilter: borough,
      sites,
      dataSource: `NYC Open Data — ${dataSource}`,
    };
  } catch (error) {
    console.error("Intel fetch failed", error);
    return {
      generatedAt: new Date().toISOString(),
      count: FALLBACK_SITES.length,
      boroughFilter: borough,
      sites: FALLBACK_SITES,
      dataSource: "Demo fallback",
      note: "Live NYC Open Data unavailable — showing illustrative sample.",
    };
  }
}
