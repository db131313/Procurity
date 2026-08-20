/**
 * Discard / QA logging for DOB normalization.
 * Local: data/ingest-discards.json. Serverless: in-memory only (read-only FS).
 */

import { promises as fs } from "fs";
import path from "path";

export type DiscardReason =
  | "missing_lat_long"
  | "failed_address_parse"
  | "duplicate_id"
  | "missing_job_key"
  | "invalid_coords";

export type DiscardRecord = {
  at: string;
  dataset: string;
  reason: DiscardReason;
  jobKey: string | null;
  bin: string | null;
  address: string | null;
  detail?: string;
};

const DISCARD_PATH = path.join(process.cwd(), "data", "ingest-discards.json");

function isServerlessRuntime() {
  return Boolean(
    process.env.NETLIFY ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.LAMBDA_TASK_ROOT ||
      process.env.VERCEL,
  );
}

let memoryDiscards: DiscardRecord[] = [];

export async function appendDiscards(rows: DiscardRecord[]) {
  if (!rows.length) return;
  if (isServerlessRuntime()) {
    memoryDiscards = [...rows, ...memoryDiscards].slice(0, 2000);
    return;
  }
  let prev: DiscardRecord[] = [];
  try {
    prev = JSON.parse(await fs.readFile(DISCARD_PATH, "utf8")) as DiscardRecord[];
  } catch {
    prev = [];
  }
  const next = [...rows, ...prev].slice(0, 2000);
  try {
    await fs.mkdir(path.dirname(DISCARD_PATH), { recursive: true });
    await fs.writeFile(DISCARD_PATH, JSON.stringify(next, null, 2));
  } catch {
    memoryDiscards = next;
  }
}

export async function readDiscards(limit = 2000): Promise<DiscardRecord[]> {
  if (isServerlessRuntime()) return memoryDiscards.slice(0, limit);
  try {
    const rows = JSON.parse(
      await fs.readFile(DISCARD_PATH, "utf8"),
    ) as DiscardRecord[];
    return rows.slice(0, limit);
  } catch {
    return memoryDiscards.slice(0, limit);
  }
}
