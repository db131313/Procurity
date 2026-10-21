/**
 * DemoLead / DemoEvent persistence.
 * Prisma when DATABASE_URL is set; otherwise in-memory (local/dev only).
 * Never writes to local disk (Netlify-safe).
 */

import { isDatabaseConfigured, getPrisma } from "@/lib/db/prisma";
import type { DemoEventType } from "./types";

export type DemoLeadRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  shopName: string;
  city: string;
  createdAt: string;
};

export type DemoEventRecord = {
  id: string;
  type: string;
  city: string;
  step: string | null;
  createdAt: string;
};

const memLeads: DemoLeadRecord[] = [];
const memEvents: DemoEventRecord[] = [];

function cuid() {
  return `demo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function createDemoLead(input: {
  name: string;
  email: string;
  phone: string;
  shopName: string;
  city: string;
}): Promise<DemoLeadRecord> {
  if (isDatabaseConfigured()) {
    const row = await getPrisma().demoLead.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        shopName: input.shopName,
        city: input.city,
      },
    });
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      shopName: row.shopName,
      city: row.city,
      createdAt: row.createdAt.toISOString(),
    };
  }
  const row: DemoLeadRecord = {
    id: cuid(),
    ...input,
    createdAt: new Date().toISOString(),
  };
  memLeads.unshift(row);
  return row;
}

export async function listDemoLeads(limit = 50): Promise<DemoLeadRecord[]> {
  if (isDatabaseConfigured()) {
    const rows = await getPrisma().demoLead.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      shopName: row.shopName,
      city: row.city,
      createdAt: row.createdAt.toISOString(),
    }));
  }
  return memLeads.slice(0, limit);
}

export async function recordDemoEvent(input: {
  type: DemoEventType | string;
  city?: string;
  step?: string | null;
  meta?: Record<string, unknown> | null;
}): Promise<void> {
  if (isDatabaseConfigured()) {
    await getPrisma().demoEvent.create({
      data: {
        type: input.type,
        city: input.city ?? "",
        step: input.step ?? null,
        ...(input.meta
          ? { meta: input.meta as object }
          : {}),
      },
    });
    return;
  }
  memEvents.unshift({
    id: cuid(),
    type: input.type,
    city: input.city ?? "",
    step: input.step ?? null,
    createdAt: new Date().toISOString(),
  });
}

export async function countDemoEvents(): Promise<
  Record<string, number>
> {
  if (isDatabaseConfigured()) {
    const groups = await getPrisma().demoEvent.groupBy({
      by: ["type"],
      _count: { _all: true },
    });
    const out: Record<string, number> = {};
    for (const g of groups) out[g.type] = g._count._all;
    return out;
  }
  const out: Record<string, number> = {};
  for (const e of memEvents) out[e.type] = (out[e.type] || 0) + 1;
  return out;
}

export async function sendDemoLeadEmail(lead: DemoLeadRecord): Promise<{
  ok: boolean;
  stub?: boolean;
}> {
  const key = process.env.RESEND_API_KEY?.trim();
  const to =
    process.env.DEMO_LEAD_EMAIL?.trim() ||
    process.env.ADMIN_EMAIL?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim();
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() || "hello@procurity.pro";

  if (!key || !to) {
    console.info("[demo/lead stub]", lead);
    return { ok: true, stub: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `Demo walkthrough request · ${lead.city || "city TBD"}`,
        html: `
          <p><strong>${lead.name}</strong> booked a 15-minute walkthrough.</p>
          <ul>
            <li>Email: ${lead.email}</li>
            <li>Phone: ${lead.phone || "—"}</li>
            <li>Shop: ${lead.shopName || "—"}</li>
            <li>City: ${lead.city || "—"}</li>
          </ul>
        `,
      }),
    });
    return { ok: res.ok, stub: false };
  } catch {
    return { ok: false };
  }
}
