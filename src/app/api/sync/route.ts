import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/lib/db/prisma";
import { syncAllCities } from "@/lib/cities/sync-all";
import { syncDobData } from "@/lib/dob/sync";
import { getSyncMeta, listProjects } from "@/lib/db/store";
import { chicagoSource } from "@/lib/sources/chicago";
import { losAngelesSource } from "@/lib/sources/los-angeles";
import { sanFranciscoSource } from "@/lib/sources/san-francisco";
import { bostonSource } from "@/lib/sources/boston";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

type CityParam =
  | "nyc"
  | "chicago"
  | "los_angeles"
  | "san_francisco"
  | "boston"
  | "all";

/**
 * Authenticated sync for admin / debugging.
 * Map UI auto-syncs server-side via ensureMapDataFresh — users never call this.
 *
 * POST /api/sync?city=nyc&days=21
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.NETLIFY && !isDatabaseConfigured()) {
    return NextResponse.json(
      {
        error: "DATABASE_URL required",
        detail:
          "Netlify serverless storage is ephemeral. Set DATABASE_URL (Neon) in Netlify env, redeploy, then sync again.",
      },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const city = (url.searchParams.get("city") || "nyc") as CityParam;
  const days = Number(url.searchParams.get("days") || "21");
  const windowDays = Number.isFinite(days) ? Math.min(90, Math.max(7, days)) : 21;

  const started = Date.now();
  try {
    let result: unknown;
    if (city === "all") {
      result = await syncAllCities(windowDays);
    } else if (city === "nyc") {
      result = await syncDobData(windowDays);
    } else {
      const source =
        city === "chicago"
          ? chicagoSource
          : city === "los_angeles"
            ? losAngelesSource
            : city === "san_francisco"
              ? sanFranciscoSource
              : bostonSource;
      const projects = await source.fetchProjects({ days: windowDays });
      result = { ok: true, city, count: projects.length };
    }

    const meta = await getSyncMeta();
    const listed = await listProjects({
      city: city === "all" ? undefined : city,
    });

    return NextResponse.json({
      ok: true,
      city,
      windowDays,
      elapsedMs: Date.now() - started,
      databaseConfigured: isDatabaseConfigured(),
      result,
      projectCount: meta.projectCount || listed.length,
      lastSyncAt: meta.lastSyncAt,
      sample: listed.slice(0, 3).map((p) => ({
        id: p.id,
        city: p.city,
        address: p.address,
        score: p.score,
        borough: p.borough,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[api/sync] failed", error);
    return NextResponse.json(
      {
        error: "Sync failed",
        detail: message,
        stack: process.env.NODE_ENV === "production" ? undefined : stack,
        databaseConfigured: isDatabaseConfigured(),
        elapsedMs: Date.now() - started,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
