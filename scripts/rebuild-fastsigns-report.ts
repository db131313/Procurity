/**
 * Rebuild FASTSIGNS coverage reports from the geocode cache (no network).
 * Also improves city-name extraction for expansion grouping.
 */
import { promises as fs } from "fs";
import { parseFastsignsRaw } from "./fastsigns-coverage";

const STREET_END =
  /\b(?:St|Street|Ave|Avenue|Blvd|Boulevard|Rd|Road|Dr|Drive|Pkwy|Parkway|Hwy|Highway|Way|Ln|Lane|Ct|Court|Cir|Circle|Pl|Place|Ter|Terrace|Trl|Trail|Expy|Expressway|Fwy|Freeway|Sq|Square|Loop|Pike)\b\.?(?:\s+(?:N|S|E|W|NE|NW|SE|SW)\b)?/gi;

function extractCity(streetAndCity: string): string {
  let lastEnd = -1;
  const re = new RegExp(STREET_END.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(streetAndCity)) !== null) {
    lastEnd = m.index + m[0].length;
  }
  let rest = lastEnd > 0 ? streetAndCity.slice(lastEnd) : streetAndCity;
  rest = rest
    .replace(/^[\s,.-]+/, "")
    .replace(/^(?:Ste|Suite|Unit|#)\s*[\w-]+\s+/i, "")
    .replace(/\s+(?:Ste|Suite|Unit|#)\s*[\w-]+$/i, "")
    .trim();
  if (rest) return rest;
  const parts = streetAndCity.trim().split(/\s+/);
  return parts[parts.length - 1] || streetAndCity;
}

type Cache = Record<string, { lat: number; lng: number } | null>;

const METROS: Record<
  string,
  { label: string; bounds: { west: number; south: number; east: number; north: number } }
> = {
  nyc: { label: "NYC", bounds: { west: -74.28, south: 40.48, east: -73.68, north: 40.95 } },
  chicago: { label: "Chicago", bounds: { west: -88.05, south: 41.6, east: -87.5, north: 42.1 } },
  los_angeles: {
    label: "Los Angeles",
    bounds: { west: -118.7, south: 33.7, east: -117.9, north: 34.35 },
  },
  san_francisco: {
    label: "San Francisco",
    bounds: { west: -122.55, south: 37.45, east: -121.85, north: 37.95 },
  },
  boston: { label: "Boston", bounds: { west: -71.25, south: 42.2, east: -70.85, north: 42.5 } },
  seattle: {
    label: "Seattle",
    bounds: { west: -122.45, south: 47.45, east: -122.15, north: 47.75 },
  },
  fort_worth: {
    label: "Fort Worth",
    bounds: { west: -97.55, south: 32.55, east: -97.05, north: 33.05 },
  },
  miami_dade: {
    label: "Miami-Dade",
    bounds: { west: -80.55, south: 25.35, east: -80.05, north: 26.05 },
  },
};

function matchMetro(lat: number, lng: number) {
  for (const [code, meta] of Object.entries(METROS)) {
    const b = meta.bounds;
    if (lng >= b.west && lng <= b.east && lat >= b.south && lat <= b.north) {
      return code;
    }
  }
  return null;
}

async function main() {
  const raw = await fs.readFile("scripts/data/fastsigns-locations-raw.txt", "utf8");
  const parsed = parseFastsignsRaw(raw).map((p) => {
    const left = p.addressLine.replace(
      /,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\s+USA\s*$/i,
      "",
    );
    return { ...p, city: extractCity(left) };
  });
  const cache = JSON.parse(
    await fs.readFile("scripts/data/fastsigns-geocode-cache.json", "utf8"),
  ) as Cache;

  const rows = parsed.map((loc) => {
    const coords = cache[loc.addressLine];
    const latitude = coords?.lat ?? null;
    const longitude = coords?.lng ?? null;
    return {
      ...loc,
      latitude,
      longitude,
      geocodeStatus: (coords ? "ok" : "failed") as "ok" | "failed",
      metro:
        latitude != null && longitude != null
          ? matchMetro(latitude, longitude)
          : null,
    };
  });

  const byMetro: Record<string, typeof rows> = Object.fromEntries(
    Object.keys(METROS).map((k) => [k, [] as typeof rows]),
  );
  const outside: typeof rows = [];
  const failed: typeof rows = [];
  for (const loc of rows) {
    if (loc.geocodeStatus !== "ok") {
      failed.push(loc);
      continue;
    }
    if (loc.metro) byMetro[loc.metro].push(loc);
    else outside.push(loc);
  }

  const outsideByState: Record<string, typeof rows> = {};
  for (const loc of outside) (outsideByState[loc.state] ||= []).push(loc);

  const summary = {
    generatedAt: new Date().toISOString(),
    source: "scripts/data/fastsigns-locations-raw.txt (FASTSIGNS public directory)",
    totalUsParsed: parsed.length,
    geocodedOk: rows.filter((l) => l.geocodeStatus === "ok").length,
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
            latitude: l.latitude,
            longitude: l.longitude,
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
            byCity: Object.entries(
              locs.reduce<Record<string, number>>((acc, l) => {
                const k = `${l.city}, ${l.state}`;
                acc[k] = (acc[k] || 0) + 1;
                return acc;
              }, {}),
            )
              .sort((a, b) => b[1] - a[1])
              .slice(0, 20)
              .map(([city, count]) => ({ city, count })),
          },
        ]),
    ),
  };

  await fs.mkdir("reports", { recursive: true });
  await fs.writeFile(
    "reports/fastsigns-coverage.json",
    JSON.stringify(summary, null, 2),
  );

  const csv = [
    "name,address,city,state,zip,latitude,longitude,geocodeStatus,metro",
  ];
  const esc = (s: string) =>
    /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  for (const loc of rows) {
    csv.push(
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
        .map((v) => esc(String(v)))
        .join(","),
    );
  }
  await fs.writeFile("reports/fastsigns-coverage.csv", csv.join("\n"));

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
  md.push("## Outside coverage — top states (expansion priority)");
  md.push("");
  md.push("| State | Locations | Highest-density cities |");
  md.push("| --- | ---: | --- |");
  for (const [state, info] of Object.entries(summary.outsideByState).slice(0, 25)) {
    const tops = info.byCity
      .slice(0, 5)
      .map((c) => `${c.city} (${c.count})`)
      .join("; ");
    md.push(`| ${state} | ${info.count} | ${tops} |`);
  }
  md.push("");
  md.push("## Notes");
  md.push("");
  md.push("- Metro match uses bounding boxes (approximate metro extents).");
  md.push(
    "- Source: public FASTSIGNS location directory (business name/address only).",
  );
  md.push(
    "- Geocoding: US Census Bureau public geocoder; see CSV for failures.",
  );
  md.push("- Regenerate: `npx tsx scripts/fastsigns-coverage.ts`");
  md.push("");
  await fs.writeFile("reports/fastsigns-coverage.md", md.join("\n"));
  console.log({
    covered: summary.coveredTotal,
    outside: summary.outsideTotal,
    failed: summary.geocodeFailed,
    topTX: summary.outsideByState.TX?.byCity.slice(0, 8),
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
