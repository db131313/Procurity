import { NextResponse } from "next/server";
import { requireMobileJobsUser } from "@/lib/mobile/auth";
import { getJobBundle } from "@/lib/jobs/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/mobile/jobs/[id] — job detail bundle for scanning. */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileJobsUser(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const bundle = await getJobBundle(id, auth.user.id);
  if (!bundle) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    job: bundle.job,
    scans: bundle.scans,
    measurements: bundle.measurements,
    designSpec: bundle.designSpec,
    lineItems: bundle.lineItems,
  });
}
