import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { localUploadPath } from "@/lib/jobs/storage";

export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".usdz": "model/vnd.usdz+zip",
  ".obj": "text/plain",
  ".ply": "application/octet-stream",
};

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await ctx.params;
  const relative = parts.join("/");
  if (!relative || relative.includes("..")) {
    return new NextResponse("Bad path", { status: 400 });
  }
  const abs = localUploadPath(relative);
  try {
    const buf = await fs.readFile(abs);
    const ext = path.extname(abs).toLowerCase();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
