import type { DemoProject } from "./types";
import { projectTeaserLabel } from "@/lib/cities/teaser-label";

type SampleSeed = {
  address: string;
  lat: number;
  lng: number;
  jobType: string;
  phase: string;
  score: number;
  reasons: string[];
  valueLow: number;
  valueHigh: number;
};

const SAMPLE_BY_CITY: Record<string, SampleSeed[]> = {
  nyc: [
    {
      address: "412 Atlantic Ave, Brooklyn, NY",
      lat: 40.6855,
      lng: -73.9782,
      jobType: "restaurant",
      phase: "interior_finishing",
      score: 78,
      reasons: [
        "Interior finishing usually means signage is next",
        "Commercial storefront size fits channel letters",
      ],
      valueLow: 8000,
      valueHigh: 18000,
    },
    {
      address: "88 Pine St, New York, NY",
      lat: 40.706,
      lng: -74.0075,
      jobType: "office",
      phase: "sign_ready",
      score: 84,
      reasons: [
        "Lobby refresh often includes directory and blade signs",
        "Score elevated by recent site activity",
      ],
      valueLow: 12000,
      valueHigh: 28000,
    },
    {
      address: "255 W 36th St, New York, NY",
      lat: 40.7532,
      lng: -73.991,
      jobType: "retail",
      phase: "signage_filed",
      score: 62,
      reasons: [
        "Past the typical buying window — shown as an example only",
        "Retail frontage suggests illuminated letters",
      ],
      valueLow: 6000,
      valueHigh: 14000,
    },
  ],
  chicago: [
    {
      address: "233 S Wacker Dr, Chicago, IL",
      lat: 41.8789,
      lng: -87.6359,
      jobType: "office",
      phase: "sign_ready",
      score: 81,
      reasons: [
        "Large commercial lobby — directory work is common",
        "Timing looks right for a first outreach",
      ],
      valueLow: 15000,
      valueHigh: 35000,
    },
    {
      address: "900 N Michigan Ave, Chicago, IL",
      lat: 41.8992,
      lng: -87.6245,
      jobType: "retail",
      phase: "interior_finishing",
      score: 76,
      reasons: [
        "Retail renovation often needs storefront identity",
        "High foot traffic corridor",
      ],
      valueLow: 9000,
      valueHigh: 22000,
    },
    {
      address: "1200 W Fulton Market, Chicago, IL",
      lat: 41.8866,
      lng: -87.657,
      jobType: "restaurant",
      phase: "signage_filed",
      score: 58,
      reasons: [
        "Example only — past the buying window",
        "Restaurant build-outs usually need exterior branding",
      ],
      valueLow: 7000,
      valueHigh: 16000,
    },
  ],
  los_angeles: [
    {
      address: "6801 Hollywood Blvd, Los Angeles, CA",
      lat: 34.1022,
      lng: -118.34,
      jobType: "retail",
      phase: "sign_ready",
      score: 79,
      reasons: [
        "Tourist corridor — visible storefront signs matter",
        "Phase suggests install window is open",
      ],
      valueLow: 10000,
      valueHigh: 24000,
    },
    {
      address: "2121 Avenue of the Stars, Los Angeles, CA",
      lat: 34.0565,
      lng: -118.413,
      jobType: "office",
      phase: "interior_finishing",
      score: 73,
      reasons: [
        "Office fit-out often includes lobby identity",
        "Good moment to introduce your shop",
      ],
      valueLow: 14000,
      valueHigh: 32000,
    },
  ],
  san_francisco: [
    {
      address: "1 Ferry Building, San Francisco, CA",
      lat: 37.7955,
      lng: -122.3937,
      jobType: "retail",
      phase: "sign_ready",
      score: 80,
      reasons: [
        "High-visibility waterfront retail",
        "Ready for exterior identity work",
      ],
      valueLow: 11000,
      valueHigh: 26000,
    },
    {
      address: "555 California St, San Francisco, CA",
      lat: 37.792,
      lng: -122.403,
      jobType: "office",
      phase: "interior_finishing",
      score: 74,
      reasons: [
        "Downtown office — directory and plaque work is common",
        "Score reflects recent activity",
      ],
      valueLow: 13000,
      valueHigh: 30000,
    },
  ],
  seattle: [
    {
      address: "400 Pine St, Seattle, WA",
      lat: 47.6115,
      lng: -122.337,
      jobType: "retail",
      phase: "sign_ready",
      score: 77,
      reasons: [
        "Downtown retail frontage",
        "Phase suggests a near-term install window",
      ],
      valueLow: 8000,
      valueHigh: 19000,
    },
    {
      address: "2001 8th Ave, Seattle, WA",
      lat: 47.6156,
      lng: -122.3378,
      jobType: "office",
      phase: "interior_finishing",
      score: 71,
      reasons: [
        "Office tower lobby refresh pattern",
        "Good first-call opportunity",
      ],
      valueLow: 12000,
      valueHigh: 28000,
    },
  ],
  boston: [
    {
      address: "100 Summer St, Boston, MA",
      lat: 42.3532,
      lng: -71.0575,
      jobType: "office",
      phase: "sign_ready",
      score: 82,
      reasons: [
        "Financial district lobby work",
        "Timing looks right for outreach",
      ],
      valueLow: 14000,
      valueHigh: 32000,
    },
    {
      address: "800 Boylston St, Boston, MA",
      lat: 42.3473,
      lng: -71.0822,
      jobType: "retail",
      phase: "interior_finishing",
      score: 75,
      reasons: [
        "Mixed retail corridor",
        "Storefront identity often follows fit-out",
      ],
      valueLow: 9000,
      valueHigh: 21000,
    },
  ],
  fort_worth: [
    {
      address: "301 Commerce St, Fort Worth, TX",
      lat: 32.7555,
      lng: -97.3308,
      jobType: "hotel",
      phase: "sign_ready",
      score: 78,
      reasons: [
        "Hospitality projects need exterior and wayfinding",
        "Phase suggests install readiness",
      ],
      valueLow: 16000,
      valueHigh: 40000,
    },
    {
      address: "500 Main St, Fort Worth, TX",
      lat: 32.7549,
      lng: -97.3315,
      jobType: "retail",
      phase: "interior_finishing",
      score: 70,
      reasons: [
        "Downtown retail renovation",
        "Good moment to introduce channel letters",
      ],
      valueLow: 7000,
      valueHigh: 17000,
    },
  ],
  miami_dade: [
    {
      address: "1100 Brickell Ave, Miami, FL",
      lat: 25.762,
      lng: -80.1915,
      jobType: "office",
      phase: "sign_ready",
      score: 83,
      reasons: [
        "Brickell office corridor",
        "Lobby identity work is common at this phase",
      ],
      valueLow: 15000,
      valueHigh: 36000,
    },
    {
      address: "320 Lincoln Rd, Miami Beach, FL",
      lat: 25.7907,
      lng: -80.13,
      jobType: "retail",
      phase: "interior_finishing",
      score: 76,
      reasons: [
        "High-visibility retail strip",
        "Fit-out usually precedes exterior branding",
      ],
      valueLow: 10000,
      valueHigh: 24000,
    },
  ],
};

function toSample(
  cityId: string,
  seed: SampleSeed,
  index: number,
): DemoProject {
  return {
    id: `sample-${cityId}-${index}`,
    kind: "sample",
    address: seed.address,
    cityId,
    latitude: seed.lat,
    longitude: seed.lng,
    projectType: projectTeaserLabel(seed.jobType, null, null),
    phase: seed.phase,
    phaseLabel: seed.phase.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    score: seed.score,
    scoreReasons: seed.reasons,
    valueLow: seed.valueLow,
    valueHigh: seed.valueHigh,
    contactMasked: "Contact on file · masked",
    label: "Sample project",
  };
}

/** Enough sample fillers so every city can reach 6–12 demo pins. */
export function sampleProjectsForCity(
  cityId: string,
  count: number,
): DemoProject[] {
  const seeds = SAMPLE_BY_CITY[cityId] ?? SAMPLE_BY_CITY.nyc!;
  const out: DemoProject[] = [];
  for (let i = 0; i < count; i++) {
    const seed = seeds[i % seeds.length]!;
    // Slight lat/lng jitter so duplicates don't stack
    const jitter = Math.floor(i / seeds.length);
    out.push(
      toSample(
        cityId,
        {
          ...seed,
          address:
            jitter > 0
              ? seed.address.replace(/^(\d+)/, (_, n) =>
                  String(Number(n) + jitter * 10),
                )
              : seed.address,
          lat: seed.lat + jitter * 0.004,
          lng: seed.lng + jitter * 0.004,
          score: Math.max(50, seed.score - jitter * 3),
        },
        i,
      ),
    );
  }
  return out;
}
