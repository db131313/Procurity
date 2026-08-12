/**
 * Discard / QA logging for DOB normalization.
 * Written to data/ingest-discards.json so silent drops are inspectable.
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

export async function appendDiscards(rows: DiscardRecord[]) {
  if (!rows.length) return;
  let prev: DiscardRecord[] = [];
  try {
    prev = JSON.parse(await fs.readFile(DISCARD_PATH, "utf8")) as DiscardRecord[];
  } catch {
    prev = [];
  }
  // Keep last ~2000 discards for inspectability
  const next = [...rows, ...prev].slice(0, 2000);
  await fs.mkdir(path.dirname(DISCARD_PATH), { recursive: true });
  await fs.writeFile(DISCARD_PATH, JSON.stringify(next, null, 2));
}

export async function readDiscards(limit = 200): Promise<DiscardRecord[]> {
  try {
    const rows = JSON.parse(
      await fs.readFile(DISCARD_PATH, "utf8"),
    ) as DiscardRecord[];
    return rows.slice(0, limit);
  } catch {
    return [];
  }
}
