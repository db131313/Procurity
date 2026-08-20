import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/prisma";
import { syncAllCities } from "@/lib/cities/sync-all";
import { syncDobData } from "@/lib/dob/sync";
import { getSyncMeta, listProjects } from "@/lib/db/store";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function authorize(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET?.trim();
  const isDev = process.env.NODE_ENV !== "production";
  return (
    isDev ||
    !secret ||
    authHeader === `Bearer ${secret}` ||
    request.headers.get("x-cron-secret") === secret
  );
}

/**
 * Multi-city / NYC cron ingest.
 * Query: ?city=nyc|all (default all) &days=21
 */
export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.NETLIFY && !isDatabaseConfigured()) {
    return NextResponse.json(
      {
        error: "DATABASE_URL required",
        detail:
          "Set Neon DATABASE_URL in Netlify env. Without it, sync cannot persist on serverless.",
        errorType: "ConfigError",
      },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const city = url.searchParams.get("city") || "all";
  const days = Number(url.searchParams.get("days") || "21");
  const windowDays = Number.isFinite(days) ? Math.min(90, Math.max(7, days)) : 21;
  const started = Date.now();

  try {
    const result =
      city === "nyc"
        ? { ok: true, cities: ["nyc"], results: { nyc: await syncDobData(windowDays).then((r) => ({ ok: true, count: r.counts.projects, raw: r.counts })) } }
        : await syncAllCities(windowDays);

    const meta = await getSyncMeta();
    const listed = await listProjects(city === "nyc" ? { city: "nyc" } : undefined);

    return NextResponse.json({
      ...result,
      windowDays,
      elapsedMs: Date.now() - started,
      databaseConfigured: true,
      projectCount: meta.projectCount || listed.length,
      lastSyncAt: meta.lastSyncAt,
      sample: listed.slice(0, 5).map((p) => ({
        id: p.id,
        city: p.city,
        address: p.address,
        score: p.score,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("sync-cities failed", error);
    // Always return JSON — Netlify's "An unknown error has occurred" means we crashed
    // before sending a response (timeout/OOM). Prefer explicit detail when we catch.
    return NextResponse.json(
      {
        error: "Sync failed",
        errorType: error instanceof Error ? error.name : "Error",
        errorMessage: message,
        detail: message,
        stack: stack?.split("\n").slice(0, 8),
        databaseConfigured: isDatabaseConfigured(),
        elapsedMs: Date.now() - started,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
