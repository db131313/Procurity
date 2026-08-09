import { fetchDobNowCandidates, fetchPhonesByBins } from "./nyc-dob";
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
    const filings = await fetchDobNowCandidates(500);
    const filtered = borough
      ? filings.filter(
          (f) => f.borough?.toLowerCase() === borough.toLowerCase(),
        )
      : filings;

    const bins = filtered.map((f) => f.bin ?? "").filter(Boolean);
    const phones = await fetchPhonesByBins(bins);

    const scored = filtered
      .map((f) => scoreFiling(f, phones))
      .filter((s): s is ScoredSite => Boolean(s));

    const sites = rankTopSites(scored, limit);

    if (sites.length === 0) {
      return {
        generatedAt: new Date().toISOString(),
        count: FALLBACK_SITES.length,
        boroughFilter: borough,
        sites: FALLBACK_SITES,
        dataSource: "NYC DOB NOW (fallback sample)",
        note: "Live filings returned no scored matches for this filter.",
      };
    }

    return {
      generatedAt: new Date().toISOString(),
      count: sites.length,
      boroughFilter: borough,
      sites,
      dataSource:
        "NYC Open Data — DOB NOW: Build Job Application Filings (w9ak-ipjd)",
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
