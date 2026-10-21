import { NextResponse } from "next/server";
import { recordDemoEvent } from "@/lib/demo/store";
import type { DemoEventType } from "@/lib/demo/types";

export const dynamic = "force-dynamic";

const ALLOWED: DemoEventType[] = [
  "demo_started",
  "step_completed",
  "demo_finished",
  "cta_clicked",
  "lead_submitted",
];

/** Fire-and-forget demo analytics — no personal data. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      type?: string;
      city?: string;
      step?: string;
    };
    const type = body.type as DemoEventType | undefined;
    if (!type || !ALLOWED.includes(type)) {
      return NextResponse.json({ ok: false, error: "Invalid type" }, { status: 400 });
    }
    await recordDemoEvent({
      type,
      city: (body.city || "").slice(0, 40),
      step: body.step ? String(body.step).slice(0, 40) : null,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
