/**
 * File storage for job scans / PDFs.
 * Local disk when writable; on Netlify/serverless (read-only FS) persist as a
 * data URL so Neon/JSON stores hold the bytes instead of `/data/uploads`.
 * Optional Firebase Storage upload when FIREBASE_SERVICE_ACCOUNT_JSON is set.
 */

import { promises as fs } from "fs";
import path from "path";
import { newId } from "./id";

const LOCAL_DIR = path.join(process.cwd(), "data", "uploads");
const TMP_DIR = path.join("/tmp", "procurity-uploads");
/** Soft cap so data URLs stay within Neon TEXT + response size limits. */
const DATA_URL_MAX_BYTES = 3.5 * 1024 * 1024;

export function isFirebaseStorageConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  );
}

function isServerlessRuntime() {
  return Boolean(
    process.env.NETLIFY ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.LAMBDA_TASK_ROOT ||
      process.env.VERCEL ||
      process.env.JOBS_STORAGE === "data-url",
  );
}

export type StoredFile = {
  url: string;
  fileName: string;
  mimeType: string;
  storage: "firebase" | "local" | "data-url" | "tmp";
};

async function tryFirebaseUpload(input: {
  key: string;
  mimeType: string;
  bytes: Buffer;
}): Promise<StoredFile | null> {
  const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  const bucket =
    process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  if (!saRaw || !bucket) return null;

  try {
    const sa = JSON.parse(saRaw) as {
      client_email: string;
      private_key: string;
      project_id?: string;
    };
    // Use GCS JSON API with a short-lived OAuth token from the service account.
    const { GoogleAuth } = await importGoogleAuthShim(sa);
    const accessToken = await GoogleAuth();
    if (!accessToken) return null;

    const objectName = `jobs/${input.key}`;
    const uploadUrl =
      `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o` +
      `?uploadType=media&name=${encodeURIComponent(objectName)}`;
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": input.mimeType,
      },
      body: new Uint8Array(input.bytes),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[jobs/storage] Firebase upload failed", text.slice(0, 300));
      return null;
    }
    // Public-ish download URL via Firebase download tokens is complex; use GCS media link
    // with alt=media requires auth. Prefer firebase download URL pattern when bucket is public,
    // else fall through. Store a durable appspot URL when possible.
    const encoded = encodeURIComponent(objectName);
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encoded}?alt=media`;
    return {
      url,
      fileName: path.basename(input.key),
      mimeType: input.mimeType,
      storage: "firebase",
    };
  } catch (e) {
    console.error("[jobs/storage] Firebase upload error", e);
    return null;
  }
}

/**
 * Minimal JWT assertion → access_token without pulling in google-auth-library.
 * Returns null if crypto/sign fails so callers can fall back.
 */
async function importGoogleAuthShim(sa: {
  client_email: string;
  private_key: string;
}): Promise<{ GoogleAuth: () => Promise<string | null> }> {
  return {
    GoogleAuth: async () => {
      try {
        const crypto = await import("crypto");
        const now = Math.floor(Date.now() / 1000);
        const header = Buffer.from(
          JSON.stringify({ alg: "RS256", typ: "JWT" }),
        ).toString("base64url");
        const claim = Buffer.from(
          JSON.stringify({
            iss: sa.client_email,
            scope: "https://www.googleapis.com/auth/devstorage.read_write",
            aud: "https://oauth2.googleapis.com/token",
            exp: now + 3600,
            iat: now,
          }),
        ).toString("base64url");
        const unsigned = `${header}.${claim}`;
        const sign = crypto.createSign("RSA-SHA256");
        sign.update(unsigned);
        const signature = sign.sign(sa.private_key, "base64url");
        const assertion = `${unsigned}.${signature}`;
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion,
          }),
        });
        if (!tokenRes.ok) return null;
        const json = (await tokenRes.json()) as { access_token?: string };
        return json.access_token ?? null;
      } catch {
        return null;
      }
    },
  };
}

function asDataUrl(mimeType: string, bytes: Buffer): StoredFile {
  if (bytes.length > DATA_URL_MAX_BYTES) {
    throw new Error(
      `File is too large to store without Firebase Storage (${Math.round(bytes.length / 1024)}KB). Set FIREBASE_SERVICE_ACCOUNT_JSON or use a smaller file.`,
    );
  }
  return {
    url: `data:${mimeType};base64,${bytes.toString("base64")}`,
    fileName: "stored",
    mimeType,
    storage: "data-url",
  };
}

async function writeLocal(
  root: string,
  key: string,
  bytes: Buffer,
): Promise<void> {
  const abs = path.join(root, key);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, bytes);
}

/**
 * Server-side store for PDF/scan buffers.
 * Order: Firebase (if SA configured) → local data/uploads → /tmp → Neon data URL.
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

  const firebase = await tryFirebaseUpload({
    key,
    mimeType: input.mimeType,
    bytes: input.bytes,
  });
  if (firebase) {
    return { ...firebase, fileName: input.fileName };
  }

  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  if (!isServerlessRuntime()) {
    try {
      await writeLocal(LOCAL_DIR, key, input.bytes);
      return {
        url: `${base}/api/jobs/files/${key}`,
        fileName: input.fileName,
        mimeType: input.mimeType,
        storage: "local",
      };
    } catch (e) {
      console.warn(
        "[jobs/storage] local write failed, falling back",
        e instanceof Error ? e.message : e,
      );
    }
  }

  // Serverless: /tmp is writable but ephemeral — still useful within the same instance.
  try {
    await writeLocal(TMP_DIR, key, input.bytes);
    // Prefer durable data URL for PDFs so Open PDF works across cold starts.
    if (
      input.mimeType === "application/pdf" ||
      input.bytes.length <= DATA_URL_MAX_BYTES
    ) {
      const data = asDataUrl(input.mimeType, input.bytes);
      return { ...data, fileName: input.fileName };
    }
    return {
      url: `${base}/api/jobs/files/${key}`,
      fileName: input.fileName,
      mimeType: input.mimeType,
      storage: "tmp",
    };
  } catch (e) {
    console.warn(
      "[jobs/storage] /tmp write failed, using data URL",
      e instanceof Error ? e.message : e,
    );
  }

  const data = asDataUrl(input.mimeType, input.bytes);
  return { ...data, fileName: input.fileName };
}

export function localUploadPath(relativeKey: string) {
  const cleaned = relativeKey.replace(/\.\./g, "").replace(/^\/+/, "");
  const fromLocal = path.join(LOCAL_DIR, cleaned);
  const fromTmp = path.join(TMP_DIR, cleaned);
  return { fromLocal, fromTmp, cleaned };
}

export async function readJobFileBytes(
  relativeKey: string,
): Promise<Buffer | null> {
  const { fromLocal, fromTmp } = localUploadPath(relativeKey);
  for (const abs of [fromLocal, fromTmp]) {
    try {
      return await fs.readFile(abs);
    } catch {
      /* try next */
    }
  }
  return null;
}
