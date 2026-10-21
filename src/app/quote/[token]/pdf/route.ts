import { NextResponse } from "next/server";
import { getQuotePdfPayloadByToken } from "@/lib/jobs/store";
import { pdfNextResponse } from "@/lib/jobs/pdf-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Public customer PDF — validated by quote accept token (no login).
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  if (!token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const payload = await getQuotePdfPayloadByToken(token);
  if (!payload) {
    return NextResponse.json({ error: "PDF not found" }, { status: 404 });
  }

  const download =
    new URL(request.url).searchParams.get("download") === "1";
  return pdfNextResponse(payload, { download });
}
