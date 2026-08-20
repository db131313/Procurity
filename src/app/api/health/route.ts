import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/prisma";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { stripeConfigured } from "@/lib/stripe";
import { getSyncMeta, listProjects } from "@/lib/db/store";

/**
 * Public readiness probe (no secrets). Used to verify Netlify env wiring.
 */
export async function GET() {
  let projectCount = 0;
  let lastSyncAt: string | null = null;
  let storeError: string | null = null;
  try {
    const meta = await getSyncMeta();
    projectCount = meta.projectCount;
    lastSyncAt = meta.lastSyncAt;
    if (!projectCount) {
      projectCount = (await listProjects()).length;
    }
  } catch (err) {
    storeError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    ok: true,
    host: "procurity",
    databaseConfigured: isDatabaseConfigured(),
    firebaseConfigured: isFirebaseConfigured(),
    stripeConfigured: stripeConfigured(),
    projectCount,
    lastSyncAt,
    storeError,
    nodeEnv: process.env.NODE_ENV,
    hasCronSecret: Boolean(process.env.CRON_SECRET?.trim()),
    appUrl: process.env.NEXT_PUBLIC_APP_URL || null,
  });
}
