/**
 * Daily route helpers — nearest-neighbor visit order (v1, not full TSP).
 */

export type LatLng = { latitude: number; longitude: number };

export function haversineMiles(a: LatLng, b: LatLng): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Order stops by nearest-neighbor from `start`.
 * Mutates a copy; returns stops with `visitOrder` 1..n and `milesFromPrev`.
 */
export function orderNearestNeighbor<T extends LatLng>(
  start: LatLng,
  stops: T[],
): (T & { visitOrder: number; milesFromPrev: number })[] {
  const remaining = [...stops];
  const ordered: (T & { visitOrder: number; milesFromPrev: number })[] = [];
  let cursor = start;

  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineMiles(cursor, remaining[i]!);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0]!;
    ordered.push({
      ...next,
      visitOrder: ordered.length + 1,
      milesFromPrev: Math.round(bestDist * 10) / 10,
    });
    cursor = next;
  }

  return ordered;
}

/** Rough bbox (~3–4 mile radius) around a point for “near me” candidate fetch. */
export function bboxAroundPoint(
  latitude: number,
  longitude: number,
  radiusMiles = 4,
): { west: number; south: number; east: number; north: number } {
  const latDelta = radiusMiles / 69;
  const lngDelta =
    radiusMiles / (Math.cos((latitude * Math.PI) / 180) * 69.172 || 69);
  return {
    west: longitude - lngDelta,
    south: latitude - latDelta,
    east: longitude + lngDelta,
    north: latitude + latDelta,
  };
}
