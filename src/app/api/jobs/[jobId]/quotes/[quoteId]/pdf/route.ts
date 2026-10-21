import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasJobsAccess } from "@/lib/jobs/access";
import { getQuotePdfPayload } from "@/lib/jobs/store";
import { pdfNextResponse } from "@/lib/jobs/pdf-response";

export const dynamic = "force-dynamic";
/** Keep PDF responses off the Netlify static CDN. */
export const runtime = "nodejs";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ jobId: string; quoteId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasJobsAccess(user)) {
    return NextResponse.json({ error: "Jobs requires a paid plan" }, { status: 403 });
  }

  const { jobId, quoteId } = await ctx.params;
  const payload = await getQuotePdfPayload(jobId, quoteId, user.id);
  if (!payload) {
    return NextResponse.json({ error: "PDF not found" }, { status: 404 });
  }

  const download =
    new URL(request.url).searchParams.get("download") === "1";
  return pdfNextResponse(payload, { download });
}
