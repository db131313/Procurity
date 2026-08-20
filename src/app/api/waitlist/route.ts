import { NextResponse } from "next/server";

/**
 * Lightweight waitlist capture for cities we don't serve yet.
 * Persists to logs / optional WAITLIST_WEBHOOK; no auth required.
 */
export async function POST(request: Request) {
  let email = "";
  let city = "";
  try {
    const body = (await request.json()) as { email?: string; city?: string };
    email = String(body.email || "")
      .trim()
      .toLowerCase();
    city = String(body.city || "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  console.info("[waitlist]", { email, city, at: new Date().toISOString() });

  const webhook = process.env.WAITLIST_WEBHOOK_URL?.trim();
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, city, source: "procurity-teaser" }),
      });
    } catch (err) {
      console.warn("[waitlist] webhook failed", err);
    }
  }

  return NextResponse.json({ ok: true });
}
