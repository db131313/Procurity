/**
 * Approximate metro bounds for first pin fetch before MapLibre reports viewport.
 * Tuned to match DEFAULT_MAP_CAMERA (NYC) and common city deep-links.
 */

export type LonLatBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

/** Rough city extents used when the map hasn't measured bounds yet. */
export const CITY_BOUNDS: Record<string, LonLatBounds> = {
  nyc: { west: -74.28, south: 40.48, east: -73.68, north: 40.95 },
  chicago: { west: -87.95, south: 41.64, east: -87.5, north: 42.05 },
  los_angeles: { west: -118.7, south: 33.7, east: -117.9, north: 34.35 },
  san_francisco: { west: -122.52, south: 37.7, east: -122.35, north: 37.84 },
  boston: { west: -71.2, south: 42.23, east: -70.92, north: 42.42 },
  seattle: { west: -122.45, south: 47.48, east: -122.22, north: 47.74 },
  fort_worth: { west: -97.55, south: 32.6, east: -97.15, north: 32.95 },
  miami_dade: { west: -80.55, south: 25.4, east: -80.1, north: 25.98 },
};

/** Estimate a viewport bbox around a center/zoom (WebMercator-ish degrees). */
export function approxBoundsFromCamera(
  center: [number, number],
  zoom: number,
): LonLatBounds {
  const [lng, lat] = center;
  // Rough degrees visible at given zoom for ~1000px width
  const lngSpan = 360 / Math.pow(2, zoom);
  const latSpan = lngSpan * 0.75;
  return {
    west: lng - lngSpan / 2,
    south: lat - latSpan / 2,
    east: lng + lngSpan / 2,
    north: lat + latSpan / 2,
  };
}

export function boundsForCity(city?: string | null): LonLatBounds {
  if (city && CITY_BOUNDS[city]) return CITY_BOUNDS[city];
  return CITY_BOUNDS.nyc;
}
