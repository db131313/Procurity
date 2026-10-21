import { NextResponse } from "next/server";
import {
  createDemoLead,
  recordDemoEvent,
  sendDemoLeadEmail,
} from "@/lib/demo/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      phone?: string;
      shopName?: string;
      city?: string;
    };
    const name = (body.name || "").trim().slice(0, 120);
    const email = (body.email || "").trim().toLowerCase().slice(0, 160);
    const phone = (body.phone || "").trim().slice(0, 40);
    const shopName = (body.shopName || "").trim().slice(0, 120);
    const city = (body.city || "").trim().slice(0, 40);

    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { ok: false, error: "Name and a valid email are required." },
        { status: 400 },
      );
    }

    const lead = await createDemoLead({
      name,
      email,
      phone,
      shopName,
      city,
    });
    await recordDemoEvent({
      type: "lead_submitted",
      city,
      step: "end",
    });
    const mail = await sendDemoLeadEmail(lead);

    return NextResponse.json({
      ok: true,
      id: lead.id,
      emailed: mail.ok && !mail.stub,
      stub: Boolean(mail.stub),
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Could not save lead",
      },
      { status: 500 },
    );
  }
}
