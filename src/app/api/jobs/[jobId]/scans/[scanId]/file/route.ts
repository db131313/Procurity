import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasJobsAccess } from "@/lib/jobs/access";
import { requireMobileJobsUser } from "@/lib/mobile/auth";
import { getScanFilePayload } from "@/lib/jobs/store";
import { MAX_SCAN_RESPONSE_BYTES } from "@/lib/jobs/scan-urls";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Authenticated scan file (cookie session OR Bearer Firebase token).
 * Used by web Site capture and iOS after upload — never data: URLs.
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ jobId: string; scanId: string }> },
) {
  const { jobId, scanId } = await ctx.params;

  let ownerId: string | undefined;
  const bearer = request.headers.get("authorization");
  if (bearer?.toLowerCase().startsWith("bearer ")) {
    const auth = await requireMobileJobsUser(request);
    if (!auth.ok) return auth.response;
    ownerId = auth.user.id;
  } else {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasJobsAccess(user)) {
      return NextResponse.json(
        { error: "Jobs requires a paid plan" },
        { status: 403 },
      );
    }
    ownerId = user.id;
  }

  const payload = await getScanFilePayload(jobId, scanId, ownerId);
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
