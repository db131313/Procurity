/**
 * One-time FASTSIGNS US coverage analysis.
 *
 * Source: public FASTSIGNS location directory dump (name + address only).
 * Geocode: US Census Bureau free onelineaddress API (no key).
 * Output: reports/fastsigns-coverage.{json,csv,md}
 *
 * Usage: npx tsx scripts/fastsigns-coverage.ts
 */

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

type LonLatBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

type FastsignsLoc = {
  name: string;
  addressLine: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  geocodeStatus: "ok" | "failed" | "skipped";
  metro: string | null;
};

const METROS: Record<
  string,
  { label: string; bounds: LonLatBounds; states?: string[] }
> = {
  nyc: {
    label: "NYC",
    bounds: { west: -74.28, south: 40.48, east: -73.68, north: 40.95 },
    states: ["NY", "NJ"],
  },
  chicago: {
    label: "Chicago",
    bounds: { west: -88.05, south: 41.6, east: -87.5, north: 42.1 },
    states: ["IL"],
  },
  los_angeles: {
    label: "Los Angeles",
    bounds: { west: -118.7, south: 33.7, east: -117.9, north: 34.35 },
    states: ["CA"],
  },
  san_francisco: {
    label: "San Francisco",
    // Broader Bay Area so South SF / Oakland-adjacent centers can count
    bounds: { west: -122.55, south: 37.45, east: -121.85, north: 37.95 },
    states: ["CA"],
  },
  boston: {
    label: "Boston",
    bounds: { west: -71.25, south: 42.2, east: -70.85, north: 42.5 },
    states: ["MA"],
  },
  seattle: {
    label: "Seattle",
    bounds: { west: -122.45, south: 47.45, east: -122.15, north: 47.75 },
    states: ["WA"],
  },
  fort_worth: {
    label: "Fort Worth",
    bounds: { west: -97.55, south: 32.55, east: -97.05, north: 33.05 },
    states: ["TX"],
  },
  miami_dade: {
    label: "Miami-Dade",
    bounds: { west: -80.55, south: 25.35, east: -80.05, north: 26.05 },
    states: ["FL"],
  },
};

const ROOT = process.cwd();
const RAW_PATH = path.join(ROOT, "scripts/data/fastsigns-locations-raw.txt");
const OUT_DIR = path.join(ROOT, "reports");
const GEOCODE_CACHE = path.join(ROOT, "scripts/data/fastsigns-geocode-cache.json");

const US_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC","PR",
]);

function inBounds(lat: number, lng: number, b: LonLatBounds) {
  return lng >= b.west && lng <= b.east && lat >= b.south && lat <= b.north;
}

function matchMetro(lat: number, lng: number): string | null {
  for (const [code, meta] of Object.entries(METROS)) {
    if (inBounds(lat, lng, meta.bounds)) return code;
  }
  return null;
}

/** Parse public directory dump into structured locations (US only). */
export function parseFastsignsRaw(text: string): Omit<
  FastsignsLoc,
  "latitude" | "longitude" | "geocodeStatus" | "metro"
>[] {
  const lines = text.split(/\r?\n/);
  const out: Omit<
    FastsignsLoc,
    "latitude" | "longitude" | "geocodeStatus" | "metro"
  >[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim().replace(/^-+\s*/, "");
    if (!/^FASTSIGNS/i.test(line)) continue;

    // Look ahead for address line containing STATE ZIP USA
    let addressLine = "";
    for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
      const cand = lines[j].trim().replace(/^-+\s*/, "");
      if (/,\s*[A-Z]{2}\s+\d{5}/.test(cand) && /USA|Canada|CANADA/i.test(cand)) {
        addressLine = cand;
        break;
      }
    }
    if (!addressLine) continue;

    const m = addressLine.match(
      /^(.+?),\s*([A-Z]{2})\s+(\d{5})(?:-\d{4})?\s+(USA|Canada)\s*$/i,
    );
    if (!m) continue;
    const city = m[1].replace(/^.*?(\d)/, "$1"); // keep street+city as city field is messy
    // Better parse: street ends before last city token — use regex that captures city
    const m2 = addressLine.match(
      /^(.*?)\s+([^,]+),\s*([A-Z]{2})\s+(\d{5})(?:-\d{4})?\s+(USA|Canada)\s*$/i,
    );
    if (!m2) continue;
    const state = m2[3].toUpperCase();
    const country = m2[5].toUpperCase() === "USA" ? "US" : "CA";
    if (country !== "US") continue; // US-only analysis
    if (!US_STATES.has(state)) continue;

    out.push({
      name: line.replace(/®/g, "").trim(),
      addressLine,
      city: m2[2].trim(),
      state,
      zip: m2[4],
      country,
    });
  }

  // Dedupe by name+zip
  const seen = new Set<string>();
  return out.filter((loc) => {
    const key = `${loc.name}|${loc.zip}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

type Cache = Record<string, { lat: number; lng: number } | null>;

async function loadCache(): Promise<Cache> {
  try {
    return JSON.parse(await fs.readFile(GEOCODE_CACHE, "utf8")) as Cache;
  } catch {
    return {};
  }
}

async function saveCache(cache: Cache) {
  await fs.mkdir(path.dirname(GEOCODE_CACHE), { recursive: true });
  await fs.writeFile(GEOCODE_CACHE, JSON.stringify(cache, null, 2));
}

async function geocodeCensus(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  const url =
    "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?" +
    new URLSearchParams({
      address,
      benchmark: "Public_AR_Current",
      format: "json",
    }).toString();
  const res = await fetch(url, {
    headers: { "User-Agent": "ProcurityCoverageScript/1.0" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    result?: {
      addressMatches?: Array<{
        coordinates?: { x: number; y: number };
      }>;
    };
  };
  const match = data.result?.addressMatches?.[0];
  if (!match?.coordinates) return null;
  return { lat: match.coordinates.y, lng: match.coordinates.x };
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

function csvEscape(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  const raw = await fs.readFile(RAW_PATH, "utf8");
  const parsed = parseFastsignsRaw(raw);
  console.log(`Parsed ${parsed.length} US FASTSIGNS locations`);

  const cache = await loadCache();
  let hits = 0;
  let misses = 0;

  const geocoded = await mapPool(parsed, 4, async (loc, idx) => {
    const key = `${loc.addressLine}`;
    let coords = cache[key];
    if (coords === undefined) {
      // Prefer street+city+state+zip for Census
      const query = `${loc.addressLine.replace(/\s+USA\s*$/i, "")}`;
      try {
        coords = await geocodeCensus(query);
      } catch {
        coords = null;
      }
      cache[key] = coords;
      misses++;
      if (misses % 25 === 0) {
        await saveCache(cache);
        console.log(`  geocoded ${idx + 1}/${parsed.length} (cache writes=${misses})`);
      }
      // Be polite to Census API
      await new Promise((r) => setTimeout(r, 120));
    } else {
      hits++;
    }

    const latitude = coords?.lat ?? null;
    const longitude = coords?.lng ?? null;
    const metro =
      latitude != null && longitude != null
        ? matchMetro(latitude, longitude)
        : null;

    return {
      ...loc,
      latitude,
      longitude,
      geocodeStatus: coords ? ("ok" as const) : ("failed" as const),
      metro,
    } satisfies FastsignsLoc;
  });

  await saveCache(cache);
  console.log(`Geocode cache hits=${hits} new=${misses}`);

  const byMetro: Record<string, FastsignsLoc[]> = {};
  for (const code of Object.keys(METROS)) byMetro[code] = [];
  const outside: FastsignsLoc[] = [];
  const failed: FastsignsLoc[] = [];

  for (const loc of geocoded) {
    if (loc.geocodeStatus !== "ok") {
      failed.push(loc);
      continue;
    }
    if (loc.metro) byMetro[loc.metro].push(loc);
    else outside.push(loc);
  }

  const outsideByState: Record<string, FastsignsLoc[]> = {};
  for (const loc of outside) {
    (outsideByState[loc.state] ||= []).push(loc);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    source: "scripts/data/fastsigns-locations-raw.txt (FASTSIGNS public directory)",
    totalUsParsed: parsed.length,
    geocodedOk: geocoded.filter((l) => l.geocodeStatus === "ok").length,
    geocodeFailed: failed.length,
    coveredMetros: Object.fromEntries(
      Object.entries(METROS).map(([code, meta]) => [
        code,
        {
          label: meta.label,
          count: byMetro[code].length,
          locations: byMetro[code].map((l) => ({
            name: l.name,
            city: l.city,
            state: l.state,
            zip: l.zip,
          })),
        },
      ]),
    ),
    coveredTotal: Object.values(byMetro).reduce((n, a) => n + a.length, 0),
    outsideTotal: outside.length,
    outsideByState: Object.fromEntries(
      Object.entries(outsideByState)
        .sort((a, b) => b[1].length - a[1].length)
        .map(([state, locs]) => [
          state,
          {
            count: locs.length,
            // Group by city for expansion priority
            byCity: Object.entries(
              locs.reduce<Record<string, number>>((acc, l) => {
                const k = `${l.city}, ${l.state}`;
                acc[k] = (acc[k] || 0) + 1;
                return acc;
              }, {}),
            )
              .sort((a, b) => b[1] - a[1])
              .slice(0, 15)
              .map(([city, count]) => ({ city, count })),
          },
        ]),
    ),
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(
    path.join(OUT_DIR, "fastsigns-coverage.json"),
    JSON.stringify(summary, null, 2),
  );

  const csvLines = [
    "name,address,city,state,zip,latitude,longitude,geocodeStatus,metro",
  ];
  for (const loc of geocoded) {
    csvLines.push(
      [
        loc.name,
        loc.addressLine,
        loc.city,
        loc.state,
        loc.zip,
        loc.latitude ?? "",
        loc.longitude ?? "",
        loc.geocodeStatus,
        loc.metro ?? "",
      ]
        .map((v) => csvEscape(String(v)))
        .join(","),
    );
  }
  await fs.writeFile(path.join(OUT_DIR, "fastsigns-coverage.csv"), csvLines.join("\n"));

  const md: string[] = [];
  md.push("# FASTSIGNS US coverage vs Procurity metros");
  md.push("");
  md.push(`Generated: ${summary.generatedAt}`);
  md.push("");
  md.push(`- US locations parsed: **${summary.totalUsParsed}**`);
  md.push(`- Geocoded OK: **${summary.geocodedOk}**`);
  md.push(`- Geocode failed: **${summary.geocodeFailed}**`);
  md.push(`- Inside 8 covered metros: **${summary.coveredTotal}**`);
  md.push(`- Outside all 8: **${summary.outsideTotal}**`);
  md.push("");
  md.push("## Counts inside covered metros");
  md.push("");
  md.push("| Metro | FASTSIGNS locations |");
  md.push("| --- | ---: |");
  for (const [code, meta] of Object.entries(METROS)) {
    md.push(`| ${meta.label} (\`${code}\`) | ${byMetro[code].length} |`);
  }
  md.push(`| **Total covered** | **${summary.coveredTotal}** |`);
  md.push("");
  md.push("## Outside coverage — top states");
  md.push("");
  md.push("| State | Locations | Top cities |");
  md.push("| --- | ---: | --- |");
  for (const [state, info] of Object.entries(summary.outsideByState).slice(0, 20)) {
    const tops = info.byCity
      .slice(0, 5)
      .map((c) => `${c.city} (${c.count})`)
      .join("; ");
    md.push(`| ${state} | ${info.count} | ${tops} |`);
  }
  md.push("");
  md.push("## Notes");
  md.push("");
  md.push("- Metro match uses bounding boxes (not exact city limits).");
  md.push("- Source is the public FASTSIGNS location directory (business addresses only).");
  md.push("- Geocoding via US Census Bureau public geocoder; failures listed in CSV.");
  md.push("");

  await fs.writeFile(path.join(OUT_DIR, "fastsigns-coverage.md"), md.join("\n"));
  console.log(`Wrote reports to ${OUT_DIR}`);
  console.log(
    JSON.stringify(
      {
        totalUsParsed: summary.totalUsParsed,
        coveredTotal: summary.coveredTotal,
        outsideTotal: summary.outsideTotal,
        perMetro: Object.fromEntries(
          Object.entries(summary.coveredMetros).map(([k, v]) => [k, v.count]),
        ),
      },
      null,
      2,
    ),
  );
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
