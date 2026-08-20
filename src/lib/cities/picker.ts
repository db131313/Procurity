import type { CityCode } from "@/lib/db/types";

export type PickerCity = {
  id: string;
  label: string;
  shortLabel: string;
  state: string;
  /** Maps to CityCode when we serve live permit data */
  cityCode: CityCode | null;
  served: boolean;
  /** Rough map center for teaser camera */
  center: [number, number];
  zoom: number;
};

/**
 * Marketing city quick-pick. Served cities have live adapters;
 * others show the waitlist gate instead of a teaser map.
 */
export const PICKER_CITIES: PickerCity[] = [
  {
    id: "nyc",
    label: "New York City",
    shortLabel: "NYC",
    state: "NY",
    cityCode: "nyc",
    served: true,
    center: [-73.98, 40.75],
    zoom: 11,
  },
  {
    id: "chicago",
    label: "Chicago",
    shortLabel: "Chicago",
    state: "IL",
    cityCode: "chicago",
    served: true,
    center: [-87.63, 41.88],
    zoom: 11,
  },
  {
    id: "los_angeles",
    label: "Los Angeles",
    shortLabel: "LA",
    state: "CA",
    cityCode: "los_angeles",
    served: true,
    center: [-118.24, 34.05],
    zoom: 10.5,
  },
  {
    id: "san_francisco",
    label: "San Francisco",
    shortLabel: "SF",
    state: "CA",
    cityCode: "san_francisco",
    served: true,
    center: [-122.42, 37.77],
    zoom: 12,
  },
  {
    id: "seattle",
    label: "Seattle",
    shortLabel: "Seattle",
    state: "WA",
    cityCode: "seattle",
    served: true,
    center: [-122.33, 47.61],
    zoom: 11.5,
  },
  {
    id: "boston",
    label: "Boston",
    shortLabel: "Boston",
    state: "MA",
    cityCode: "boston",
    served: true,
    center: [-71.06, 42.36],
    zoom: 12,
  },
  {
    id: "fort_worth",
    label: "Fort Worth",
    shortLabel: "Fort Worth",
    state: "TX",
    cityCode: "fort_worth",
    served: true,
    center: [-97.33, 32.75],
    zoom: 11,
  },
  {
    id: "miami_dade",
    label: "Miami-Dade",
    shortLabel: "Miami",
    state: "FL",
    cityCode: "miami_dade",
    served: true,
    center: [-80.27, 25.78],
    zoom: 10.5,
  },
  {
    id: "houston",
    label: "Houston",
    shortLabel: "Houston",
    state: "TX",
    cityCode: null,
    served: false,
    center: [-95.37, 29.76],
    zoom: 11,
  },
  {
    id: "dallas",
    label: "Dallas",
    shortLabel: "Dallas",
    state: "TX",
    cityCode: null,
    served: false,
    center: [-96.8, 32.78],
    zoom: 11,
  },
  {
    id: "phoenix",
    label: "Phoenix",
    shortLabel: "Phoenix",
    state: "AZ",
    cityCode: null,
    served: false,
    center: [-112.07, 33.45],
    zoom: 11,
  },
];

export const DEFAULT_CITY_ID = "nyc";

export function getPickerCity(id: string | null | undefined): PickerCity | null {
  if (!id) return null;
  const key = id.trim().toLowerCase().replace(/\s+/g, "_");
  return (
    PICKER_CITIES.find((c) => c.id === key || c.shortLabel.toLowerCase() === key) ??
    null
  );
}

export function resolveCityCode(
  id: string | null | undefined,
): CityCode | null {
  const city = getPickerCity(id);
  return city?.served ? city.cityCode : null;
}

/** Cookie / query key for the user's chosen city. */
export const CITY_COOKIE = "pc_city";
export const TEASER_PIN_LIMIT = 15;
