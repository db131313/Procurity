import { NextResponse } from "next/server";
import { syncDobData } from "@/lib/dob/sync";

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

  try {
    const result = await syncDobData();
    return NextResponse.json(result);
  } catch (error) {
    console.error("DOB sync failed", error);
    return NextResponse.json(
      { error: "Sync failed", detail: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
