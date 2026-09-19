import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { allowedZipFilter } from "@/lib/db/types";
import { listMapPins } from "@/lib/map/pins";
import { getPickerCity, resolveCityCode } from "@/lib/cities/picker";
import { normalizeUsZip, zipToMetro } from "@/lib/geo/zip-to-metro";
import {
  bboxAroundPoint,
  orderNearestNeighbor,
} from "@/lib/route/build-route";
import {
  navigateFullRouteUrl,
  navigateToStopUrl,
} from "@/lib/route/maps-links";

export const dynamic = "force-dynamic";

const DEFAULT_STOPS = 8;
const MIN_STOPS = 3;
const MAX_STOPS = 15;
/** Pull a larger candidate pool, then keep top-N by score before NN order. */
const CANDIDATE_POOL = 80;

type Body = {
  mode?: "near" | "zip";
  /** Browser geolocation (near me). */
  latitude?: number;
  longitude?: number;
  /** Fallback metro when location unavailable. */
  city?: string;
  zip?: string;
  limit?: number;
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  const mode = body.mode === "zip" ? "zip" : "near";
  const limit = Math.min(
    MAX_STOPS,
    Math.max(MIN_STOPS, Number(body.limit) || DEFAULT_STOPS),
  );
  const userZips = allowedZipFilter(user);

  try {
    if (mode === "zip") {
      return await buildZipRoute(body.zip, limit, userZips);
    }
    return await buildNearRoute(body, limit, userZips);
  } catch (err) {
    console.error("route/generate", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not build route" },
      { status: 500 },
    );
  }
}

async function buildZipRoute(
  zipRaw: string | undefined,
  limit: number,
  userZips: string[] | undefined,
) {
  const zip = normalizeUsZip(zipRaw || "");
  if (!zip) {
    return NextResponse.json(
      { error: "Enter a valid 5-digit zip code." },
      { status: 400 },
    );
  }
  const metro = zipToMetro(zip);
  if (!metro.covered) {
    return NextResponse.json(
      { error: "That zip isn’t in a covered metro yet." },
      { status: 400 },
    );
  }
  // Entitlement: non-Pro may only route within their allowlist.
  if (Array.isArray(userZips) && !userZips.includes(zip)) {
    return NextResponse.json(
      { error: "That zip isn’t in your territory. Update zips in Settings." },
      { status: 403 },
    );
  }

  const zipScope = Array.isArray(userZips) ? [zip] : [zip];
  const { pins } = await listMapPins({
    city: metro.city,
    zipCodes: zipScope,
    limit: CANDIDATE_POOL,
  });

  const top = [...pins]
    .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (!top.length) {
    return NextResponse.json({
      ok: true,
      mode: "zip" as const,
      zip,
      city: metro.city,
      stops: [],
      message: `No scored sites found in ${zip}.`,
    });
  }

  const start = centroid(top);
  const ordered = orderNearestNeighbor(start, top);
  return NextResponse.json(serializeRoute("zip", ordered, start, { zip, city: metro.city }));
}

async function buildNearRoute(
  body: Body,
  limit: number,
  userZips: string[] | undefined,
) {
  const cityCode =
    resolveCityCode(body.city) ||
    getPickerCity(body.city || "nyc")?.cityCode ||
    "nyc";
  const picker = getPickerCity(cityCode) ?? getPickerCity("nyc")!;

  let latitude = Number(body.latitude);
  let longitude = Number(body.longitude);
  const hasGeo =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;

  if (!hasGeo) {
    longitude = picker.center[0]!;
    latitude = picker.center[1]!;
  }

  const bbox = bboxAroundPoint(latitude, longitude, 5);
  const { pins } = await listMapPins({
    city: cityCode,
    bbox: [bbox.west, bbox.south, bbox.east, bbox.north],
    zipCodes: userZips,
    limit: CANDIDATE_POOL,
  });

  let candidates = pins.filter(
    (p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude),
  );

  // If the tight bbox is empty (sparse area), fall back to city top scores.
  if (candidates.length < limit) {
    const fallback = await listMapPins({
      city: cityCode,
      zipCodes: userZips,
      limit: CANDIDATE_POOL,
    });
    candidates = fallback.pins.filter(
      (p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude),
    );
  }

  const top = [...candidates]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (!top.length) {
    return NextResponse.json({
      ok: true,
      mode: "near" as const,
      city: cityCode,
      stops: [],
      message: "No scored sites nearby. Try another city or zip.",
      usedGeolocation: hasGeo,
    });
  }

  const start = { latitude, longitude };
  const ordered = orderNearestNeighbor(start, top);
  return NextResponse.json(
    serializeRoute("near", ordered, start, {
      city: cityCode,
      usedGeolocation: hasGeo,
    }),
  );
}

function centroid(
  pins: { latitude: number; longitude: number }[],
): { latitude: number; longitude: number } {
  const n = pins.length || 1;
  return {
    latitude: pins.reduce((s, p) => s + p.latitude, 0) / n,
    longitude: pins.reduce((s, p) => s + p.longitude, 0) / n,
  };
}

function serializeRoute(
  mode: "near" | "zip",
  ordered: (ReturnType<typeof orderNearestNeighbor>[number] & {
    id: string;
    address: string;
    score: number;
    buyingWindowEstimate: string;
    borough: string | null;
    zip: string | null;
    city: string;
    estValueLow: number;
    estValueHigh: number;
  })[],
  start: { latitude: number; longitude: number },
  meta: Record<string, unknown>,
) {
  const stops = ordered.map((s) => ({
    id: s.id,
    visitOrder: s.visitOrder,
    address: s.address,
    score: s.score,
    buyingWindowEstimate: s.buyingWindowEstimate,
    borough: s.borough,
    zip: s.zip,
    city: s.city,
    latitude: s.latitude,
    longitude: s.longitude,
    estValueLow: s.estValueLow,
    estValueHigh: s.estValueHigh,
    milesFromPrev: s.milesFromPrev,
    navigateUrl: navigateToStopUrl({
      latitude: s.latitude,
      longitude: s.longitude,
      address: s.address,
    }),
  }));

  const fullRouteUrl = navigateFullRouteUrl(
    stops.map((s) => ({
      latitude: s.latitude,
      longitude: s.longitude,
      address: s.address,
    })),
    mode === "near" ? start : null,
  );

  return {
    ok: true,
    mode,
    ...meta,
    start,
    stopCount: stops.length,
    fullRouteUrl,
    stops,
  };
}
