import { NextResponse } from "next/server";
import { requireMobileJobsUser } from "@/lib/mobile/auth";
import {
  advanceJobStatus,
  getJobBundle,
} from "@/lib/jobs/store";
import { persistScanUpload } from "@/lib/jobs/persist-scan-upload";
import type { ScanType } from "@/lib/jobs/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function detectScanType(fileName: string, mime: string): ScanType {
  const lower = fileName.toLowerCase();
  if (
    lower.endsWith(".usdz") ||
    lower.endsWith(".glb") ||
    lower.endsWith(".gltf") ||
    lower.endsWith(".obj") ||
    lower.endsWith(".ply")
  ) {
    return "scan_3d";
  }
  if (mime.startsWith("image/")) return "photo";
  if (mime === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  return "other";
}

/**
 * POST /api/mobile/jobs/[id]/scans
 * multipart: file (required), kind? = snapshot|mesh|other
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileJobsUser(request);
  if (!auth.ok) return auth.response;

  const { id: jobId } = await ctx.params;
  const bundle = await getJobBundle(jobId, auth.user.id);
  if (!bundle) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart form data" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";
  const kind = String(form.get("kind") || "");
  const type: ScanType =
    kind === "mesh"
      ? "scan_3d"
      : detectScanType(file.name, mimeType);

  try {
    const scan = await persistScanUpload({
      jobId,
      ownerId: auth.user.id,
      fileName: file.name,
      mimeType,
      bytes,
      type,
    });
    if (!scan) {
      return NextResponse.json({ error: "Could not save scan" }, { status: 500 });
    }

    // Site capture stage when uploading from LiDAR
    if (
      bundle.job.status === "start" ||
      bundle.job.status === "site_capture"
    ) {
      await advanceJobStatus(jobId, auth.user.id, "site_capture");
    }

    return NextResponse.json({ ok: true, scan });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 },
    );
  }
}
