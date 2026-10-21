/**
 * Persist a scan upload Netlify-safely:
 * 1) Firebase Storage when SA configured (via storeJobFile)
 * 2) else DB/JSON bytes (under MAX_SCAN_RESPONSE_BYTES)
 * Mobile uploads never rely on ephemeral /tmp or data: URLs.
 */

import { storeJobFile } from "./storage";
import { addScan } from "./store";
import { MAX_SCAN_RESPONSE_BYTES, scanFilePath } from "./scan-urls";
import type { ScanType } from "./types";

export async function persistScanUpload(input: {
  jobId: string;
  ownerId: string;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
  type: ScanType;
}) {
  let firebaseUrl: string | null = null;
  try {
    const stored = await storeJobFile({
      jobId: input.jobId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      bytes: input.bytes,
      folder: "scans",
    });
    if (stored.storage === "firebase") {
      firebaseUrl = stored.url;
    }
  } catch {
    // Fall through to DB bytes
  }

  if (firebaseUrl) {
    return addScan(input.jobId, input.ownerId, {
      fileUrl: firebaseUrl,
      fileName: input.fileName,
      mimeType: input.mimeType,
      type: input.type,
    });
  }

  if (input.bytes.length > MAX_SCAN_RESPONSE_BYTES) {
    throw new Error(
      `Scan too large (${Math.round(input.bytes.length / 1024)}KB). Configure FIREBASE_SERVICE_ACCOUNT_JSON for large USDZ uploads.`,
    );
  }

  return addScan(input.jobId, input.ownerId, {
    fileUrl: scanFilePath(input.jobId, "pending"),
    fileName: input.fileName,
    mimeType: input.mimeType,
    type: input.type,
    fileBytes: input.bytes,
  });
}
