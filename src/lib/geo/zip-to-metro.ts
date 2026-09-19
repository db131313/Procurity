/**
 * Zip → covered metro mapping for signup / defaultCity routing.
 * Uses 3-digit ZIP prefixes for the 8 live scored metros.
 * Keep in sync with CITY_BOUNDS / active city set — do not fork a second system.
 */

import type { CityCode } from "@/lib/db/types";

/** Metros currently scored on the map (same set as ensure-fresh ACTIVE_CITIES). */
export const COVERED_METROS = [
  "nyc",
  "chicago",
  "los_angeles",
  "san_francisco",
  "boston",
  "seattle",
  "fort_worth",
  "miami_dade",
] as const satisfies readonly CityCode[];

export type CoveredMetro = (typeof COVERED_METROS)[number];

export type ZipMetroResult =
  | { covered: true; city: CoveredMetro; label: string }
  | { covered: false; city: null; label: null };

const METRO_LABELS: Record<CoveredMetro, string> = {
  nyc: "New York City",
  chicago: "Chicago",
  los_angeles: "Los Angeles",
  san_francisco: "San Francisco",
  boston: "Boston",
  seattle: "Seattle",
  fort_worth: "Fort Worth",
  miami_dade: "Miami-Dade",
};

/**
 * 3-digit ZIP prefix → metro.
 * Approximate metro coverage (good enough for signup routing; not legal boundaries).
 */
const ZIP3_TO_METRO: Record<string, CoveredMetro> = {
  // NYC + inner boroughs / nearby
  "100": "nyc",
  "101": "nyc",
  "102": "nyc",
  "103": "nyc",
  "104": "nyc",
  "110": "nyc",
  "111": "nyc",
  "112": "nyc",
  "113": "nyc",
  "114": "nyc",
  "116": "nyc",
  // Chicago
  "606": "chicago",
  "607": "chicago",
  "608": "chicago",
  // Los Angeles core
  "900": "los_angeles",
  "901": "los_angeles",
  "902": "los_angeles",
  "903": "los_angeles",
  "904": "los_angeles",
  "905": "los_angeles",
  "906": "los_angeles",
  "907": "los_angeles",
  "908": "los_angeles",
  "910": "los_angeles",
  "911": "los_angeles",
  "912": "los_angeles",
  "913": "los_angeles",
  "914": "los_angeles",
  "915": "los_angeles",
  "916": "los_angeles",
  "917": "los_angeles",
  "918": "los_angeles",
  // San Francisco / near SF
  "941": "san_francisco",
  "940": "san_francisco",
  // Boston
  "021": "boston",
  "022": "boston",
  "024": "boston",
  // Seattle
  "981": "seattle",
  "980": "seattle",
  // Fort Worth / west DFW
  "761": "fort_worth",
  "760": "fort_worth",
  // Miami-Dade
  "330": "miami_dade",
  "331": "miami_dade",
  "332": "miami_dade",
};

export function normalizeUsZip(raw: string): string | null {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length < 5) return null;
  return digits.slice(0, 5);
}

/** Resolve a US ZIP to one of the 8 covered metros, or uncovered. */
export function zipToMetro(rawZip: string): ZipMetroResult {
  const zip = normalizeUsZip(rawZip);
  if (!zip) return { covered: false, city: null, label: null };
  const city = ZIP3_TO_METRO[zip.slice(0, 3)];
  if (!city) return { covered: false, city: null, label: null };
  return { covered: true, city, label: METRO_LABELS[city] };
}

export function isCoveredMetro(code: string): code is CoveredMetro {
  return (COVERED_METROS as readonly string[]).includes(code);
}

/**
 * Curated zip options for Starter/Growth territory pickers.
 * Every zip must resolve via zipToMetro to its metro (covered only).
 */
export const METRO_ZIP_OPTIONS: {
  city: CoveredMetro;
  label: string;
  zips: string[];
}[] = [
  {
    city: "nyc",
    label: "New York City",
    zips: ["10001", "10019", "10128", "11201", "11211", "11354", "10451", "10301"],
  },
  {
    city: "chicago",
    label: "Chicago",
    zips: ["60601", "60611", "60614", "60622", "60654"],
  },
  {
    city: "los_angeles",
    label: "Los Angeles",
    zips: ["90012", "90015", "90024", "90028", "90045", "90210", "90401"],
  },
  {
    city: "san_francisco",
    label: "San Francisco",
    zips: ["94102", "94103", "94107", "94110", "94111"],
  },
  {
    city: "boston",
    label: "Boston",
    zips: ["02108", "02110", "02114", "02116", "02210"],
  },
  {
    city: "seattle",
    label: "Seattle",
    zips: ["98101", "98104", "98109", "98121", "98122"],
  },
  {
    city: "fort_worth",
    label: "Fort Worth",
    zips: ["76102", "76104", "76107", "76109", "76110"],
  },
  {
    city: "miami_dade",
    label: "Miami-Dade",
    zips: ["33130", "33131", "33132", "33139", "33160"],
  },
];

/** True when every zip maps to one of the 8 covered metros. */
export function allZipsCovered(zips: string[]): boolean {
  return zips.every((z) => zipToMetro(z).covered);
}
