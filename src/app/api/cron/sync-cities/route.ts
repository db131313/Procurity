import { NextResponse } from "next/server";
import { syncAllCities } from "@/lib/cities/sync-all";

/**
 * Explicit multi-city sync endpoint.
 * Auth: Bearer $CRON_SECRET (or open in development).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  const isDev = process.env.NODE_ENV !== "production";

  const authorized =
    isDev ||
    !secret ||
    authHeader === `Bearer ${secret}` ||
    request.headers.get("x-cron-secret") === secret;

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const days = Number(url.searchParams.get("days") || "90");

  try {
    const result = await syncAllCities(
      Number.isFinite(days) ? days : 90,
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("sync-cities failed", error);
    return NextResponse.json(
      { error: "Sync failed", detail: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
