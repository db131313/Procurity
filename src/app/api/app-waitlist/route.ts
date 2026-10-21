import { NextResponse } from "next/server";
import { z } from "zod";
import { isDatabaseConfigured, getPrisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const Body = z.object({
  email: z.string().email().max(200),
  source: z.string().max(64).optional(),
});

/** In-memory fallback when DATABASE_URL is unset (local / ephemeral). */
const memory = new Set<string>();

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  const email = parsed.data.email.trim().toLowerCase();
  const source = (parsed.data.source || "home").slice(0, 64);

  if (isDatabaseConfigured()) {
    try {
      const prisma = getPrisma();
      await prisma.appWaitlist.upsert({
        where: { email },
        create: { email, source },
        update: { source },
      });
    } catch (e) {
      console.error("[app-waitlist]", e);
      return NextResponse.json({ error: "Could not save" }, { status: 500 });
    }
  } else {
    memory.add(email);
  }

  return NextResponse.json({ ok: true });
}
