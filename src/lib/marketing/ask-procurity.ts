/**
 * Keyword parser for "Ask Procurity" on the public home map.
 * Designed so a real AI endpoint can replace `parseAskQuery` later.
 */

import type { MapFilterState } from "@/components/app/MapFilters";
import { DEFAULT_MAP_FILTERS } from "@/components/app/MapFilters";
import { PICKER_CITIES } from "@/lib/cities/picker";

export type AskIntent = {
  id: string;
  label: string;
  filters: MapFilterState;
  /** Optional city id to fly the camera to */
  cityId?: string;
  /** Extra client-side predicate hints (applied in HomeMapHero) */
  typeKeywords?: string[];
  minValueHint?: number;
};

export type AskResult = {
  ok: boolean;
  intent: AskIntent | null;
  message: string;
  /** Honest fallback when free text doesn't match */
  unmatched?: boolean;
};

export const ASK_SUGGESTIONS: AskIntent[] = [
  {
    id: "restaurants",
    label: "Restaurants about to open near me",
    filters: { ...DEFAULT_MAP_FILTERS, quick: "buying", scorePreset: "70-89" },
    typeKeywords: ["restaurant", "food", "dining", "cafe", "bar"],
  },
  {
    id: "hot-chicago",
    label: "Hot projects in Chicago",
    filters: { ...DEFAULT_MAP_FILTERS, quick: "hot", scorePreset: "all" },
    cityId: "chicago",
  },
  {
    id: "hotels",
    label: "New hotels",
    filters: { ...DEFAULT_MAP_FILTERS, quick: "new" },
    typeKeywords: ["hotel", "hospitality", "lodging", "motel"],
  },
  {
    id: "offices",
    label: "Offices finishing up",
    filters: { ...DEFAULT_MAP_FILTERS, quick: "buying" },
    typeKeywords: ["office", "commercial", "workspace", "hq"],
  },
  {
    id: "over-1m",
    label: "Projects worth over $1M",
    filters: { ...DEFAULT_MAP_FILTERS, scorePreset: "70-89" },
    minValueHint: 1_000_000,
  },
];

const CITY_ALIASES: Record<string, string> = {
  nyc: "nyc",
  "new york": "nyc",
  "new york city": "nyc",
  chicago: "chicago",
  "los angeles": "los_angeles",
  la: "los_angeles",
  "san francisco": "san_francisco",
  sf: "san_francisco",
  seattle: "seattle",
  boston: "boston",
  "fort worth": "fort_worth",
  miami: "miami_dade",
  "miami-dade": "miami_dade",
};

function findCityId(q: string): string | undefined {
  for (const [alias, id] of Object.entries(CITY_ALIASES)) {
    if (q.includes(alias)) return id;
  }
  for (const c of PICKER_CITIES.filter((x) => x.served)) {
    if (q.includes(c.label.toLowerCase()) || q.includes(c.shortLabel.toLowerCase())) {
      return c.id;
    }
  }
  return undefined;
}

/**
 * Parse free text / suggestion into map filters.
 * Swap this function for an LLM call later without changing the UI contract.
 */
export function parseAskQuery(raw: string): AskResult {
  const q = raw.trim().toLowerCase();
  if (!q) {
    return {
      ok: false,
      intent: null,
      message: "Ask me something, or tap a suggestion.",
      unmatched: true,
    };
  }

  // Exact suggestion match
  const suggestion = ASK_SUGGESTIONS.find(
    (s) => s.label.toLowerCase() === q || s.id === q,
  );
  if (suggestion) {
    return {
      ok: true,
      intent: suggestion,
      message: suggestion.label,
    };
  }

  const filters: MapFilterState = { ...DEFAULT_MAP_FILTERS };
  const typeKeywords: string[] = [];
  let matched = false;

  if (/\bhot\b|hottest|act now|ready to buy/.test(q)) {
    filters.quick = "hot";
    filters.scorePreset = "90+";
    matched = true;
  } else if (/\bbuying|finishing|about to open|interior/.test(q)) {
    filters.quick = "buying";
    matched = true;
  } else if (/\bnew\b|just filed|this week|recent/.test(q)) {
    filters.quick = "new";
    matched = true;
  }

  if (/\b90\+|score 90/.test(q)) {
    filters.scorePreset = "90+";
    matched = true;
  }

  const cityId = findCityId(q);
  if (cityId) matched = true;

  const typePairs: [RegExp, string[]][] = [
    [/restaurant|food|dining|cafe|bar/, ["restaurant", "food", "dining", "cafe", "bar"]],
    [/hotel|hospitality|lodging/, ["hotel", "hospitality", "lodging"]],
    [/office|workspace|hq/, ["office", "commercial", "workspace"]],
    [/retail|shop|store/, ["retail", "shop", "store"]],
    [/school|university|education/, ["school", "education", "university"]],
    [/hospital|medical|clinic/, ["hospital", "medical", "clinic"]],
    [/warehouse|industrial|logistics/, ["warehouse", "industrial", "logistics"]],
  ];
  for (const [re, keys] of typePairs) {
    if (re.test(q)) {
      typeKeywords.push(...keys);
      matched = true;
    }
  }

  let minValueHint: number | undefined;
  if (/\$?\s*1\s*m|million|over 1m|worth over/.test(q)) {
    minValueHint = 1_000_000;
    matched = true;
  }

  if (!matched) {
    return {
      ok: false,
      intent: null,
      message:
        "I can filter by type, city, score and size. Try one of these.",
      unmatched: true,
    };
  }

  const intent: AskIntent = {
    id: "freeform",
    label: raw.trim(),
    filters,
    cityId,
    typeKeywords: typeKeywords.length ? typeKeywords : undefined,
    minValueHint,
  };

  return { ok: true, intent, message: raw.trim() };
}

export function formatAskResultLine(opts: {
  count: number;
  cityLabel?: string;
  hotCount?: number;
}): string {
  const city = opts.cityLabel ? ` in ${opts.cityLabel}` : "";
  const hot =
    opts.hotCount != null && opts.hotCount > 0
      ? ` · ${opts.hotCount} hot`
      : "";
  return `${opts.count.toLocaleString()} projects${city}${hot}`;
}
