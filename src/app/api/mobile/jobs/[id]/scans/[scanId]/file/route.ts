import { NextResponse } from "next/server";
import { requireMobileJobsUser } from "@/lib/mobile/auth";
import { getScanFilePayload } from "@/lib/jobs/store";
import { MAX_SCAN_RESPONSE_BYTES } from "@/lib/jobs/scan-urls";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/mobile/jobs/[id]/scans/[scanId]/file */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string; scanId: string }> },
) {
  const auth = await requireMobileJobsUser(request);
  if (!auth.ok) return auth.response;

  const { id: jobId, scanId } = await ctx.params;
  const payload = await getScanFilePayload(jobId, scanId, auth.user.id);
  if (!payload) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (payload.bytes.length > MAX_SCAN_RESPONSE_BYTES) {
    return NextResponse.json(
      { error: "File too large for serverless response" },
      { status: 413 },
    );
  }

  const download =
    new URL(request.url).searchParams.get("download") === "1";
  return new NextResponse(new Uint8Array(payload.bytes), {
    status: 200,
    headers: {
      "Content-Type": payload.mimeType || "application/octet-stream",
      "Content-Length": String(payload.bytes.length),
      "Content-Disposition": download
        ? `attachment; filename="${payload.fileName}"`
        : `inline; filename="${payload.fileName}"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
