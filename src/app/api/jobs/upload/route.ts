import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasJobsAccess } from "@/lib/jobs/access";
import { addScan, getJobBundle, upsertDesignSpec } from "@/lib/jobs/store";
import { storeJobFile } from "@/lib/jobs/storage";
import type { ScanType } from "@/lib/jobs/types";

export const dynamic = "force-dynamic";

function detectScanType(fileName: string, mime: string): ScanType {
  const lower = fileName.toLowerCase();
  if (
    lower.endsWith(".glb") ||
    lower.endsWith(".gltf") ||
    lower.endsWith(".usdz") ||
    lower.endsWith(".obj") ||
    lower.endsWith(".ply")
  ) {
    return "scan_3d";
  }
  if (mime === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (mime.startsWith("image/")) return "photo";
  return "other";
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasJobsAccess(user)) {
    return NextResponse.json({ error: "Paid plan required" }, { status: 403 });
  }

  const form = await request.formData();
  const jobId = String(form.get("jobId") || "");
  const purpose = String(form.get("purpose") || "scan"); // scan | reference
  const file = form.get("file");
  if (!jobId || !(file instanceof File)) {
    return NextResponse.json({ error: "jobId and file required" }, { status: 400 });
  }

  const bundle = await getJobBundle(jobId, user.id);
  if (!bundle) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";
  const stored = await storeJobFile({
    jobId,
    fileName: file.name,
    mimeType,
    bytes,
    folder: purpose === "reference" ? "references" : "scans",
  });

  if (purpose === "reference") {
    const existing = bundle.designSpec?.referenceImages ?? [];
    const next = [
      ...existing,
      { url: stored.url, fileName: stored.fileName },
    ];
    await upsertDesignSpec(jobId, user.id, { referenceImages: next });
    return NextResponse.json({ ok: true, file: stored, referenceImages: next });
  }

  const scan = await addScan(jobId, user.id, {
    fileUrl: stored.url,
    fileName: stored.fileName,
    mimeType: stored.mimeType,
    type: detectScanType(file.name, mimeType),
  });
  return NextResponse.json({ ok: true, scan, file: stored });
}
