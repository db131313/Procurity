/**
 * File storage for job scans / PDFs.
 * Prefer Firebase Storage when configured; otherwise persist under data/uploads
 * and serve via /api/jobs/files/[...path].
 */

import { promises as fs } from "fs";
import path from "path";
import { newId } from "./id";

const LOCAL_DIR = path.join(process.cwd(), "data", "uploads");

export function isFirebaseStorageConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  );
}

export type StoredFile = {
  url: string;
  fileName: string;
  mimeType: string;
  storage: "firebase" | "local";
};

/**
 * Server-side store: writes buffer to local uploads (always available).
 * Firebase client upload is used from the browser when configured;
 * servers generate PDFs into local/Firebase via this helper.
 *
 * TODO(firebase-admin): add Admin SDK upload for production PDF/scan writes
 * when FIREBASE_SERVICE_ACCOUNT_JSON is present.
 */
export async function storeJobFile(input: {
  jobId: string;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
  folder?: string;
}): Promise<StoredFile> {
  const folder = input.folder || "scans";
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${input.jobId}/${folder}/${newId()}-${safeName}`;

  // Prefer local durable path in this environment; Firebase Admin optional later.
  await fs.mkdir(path.join(LOCAL_DIR, input.jobId, folder), { recursive: true });
  const abs = path.join(LOCAL_DIR, key);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, input.bytes);

  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  return {
    url: `${base}/api/jobs/files/${key}`,
    fileName: input.fileName,
    mimeType: input.mimeType,
    storage: "local",
  };
}

export function localUploadPath(relativeKey: string) {
  const cleaned = relativeKey.replace(/\.\./g, "").replace(/^\/+/, "");
  return path.join(LOCAL_DIR, cleaned);
}
