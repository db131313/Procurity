import { NextResponse } from "next/server";
import { requireMobileJobsUser } from "@/lib/mobile/auth";
import { listJobsForOwner } from "@/lib/jobs/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/mobile/jobs — list jobs for the authenticated user. */
export async function GET(request: Request) {
  const auth = await requireMobileJobsUser(request);
  if (!auth.ok) return auth.response;

  const jobs = await listJobsForOwner(auth.user.id);
  return NextResponse.json({
    ok: true,
    jobs: jobs.map((j) => ({
      id: j.id,
      customerName: j.customerName,
      siteAddress: j.siteAddress,
      status: j.status,
      updatedAt: j.updatedAt,
      createdAt: j.createdAt,
    })),
  });
}
