import { NextResponse } from "next/server";
import {
  MAX_PDF_RESPONSE_BYTES,
  pdfResponseHeaders,
  type PdfPayload,
} from "./pdf-urls";

export function pdfNextResponse(
  payload: PdfPayload,
  opts: { download?: boolean },
): NextResponse {
  if (payload.bytes.length > MAX_PDF_RESPONSE_BYTES) {
    return NextResponse.json(
      { error: "PDF too large for serverless response" },
      { status: 413 },
    );
  }
  return new NextResponse(new Uint8Array(payload.bytes), {
    status: 200,
    headers: pdfResponseHeaders(payload.fileName, {
      download: opts.download,
      byteLength: payload.bytes.length,
    }),
  });
}
