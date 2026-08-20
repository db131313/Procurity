import { NextResponse } from "next/server";
import { GET as syncCitiesGet, POST as syncCitiesPost } from "@/app/api/cron/sync-cities/route";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Back-compat alias for older cron schedules → same handler as sync-cities. */
export async function GET(request: Request) {
  return syncCitiesGet(request);
}

export async function POST(request: Request) {
  return syncCitiesPost(request);
}

export async function OPTIONS() {
  return NextResponse.json({ ok: true });
}
