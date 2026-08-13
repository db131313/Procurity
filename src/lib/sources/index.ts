import { nycDobSource } from "./nyc-dob";
import { westchesterSource } from "./westchester";
import { nassauSource } from "./nassau";
import { suffolkSource } from "./suffolk";
import { bergenSource } from "./bergen";
import type { DataSource, SourceRegionId } from "./types";

export type { DataSource, DataSourceMeta, SourceRegionId, SourceCoverageStatus } from "./types";

/** Registry of live + stub regional data sources. */
export const DATA_SOURCES: DataSource[] = [
  nycDobSource,
  westchesterSource,
  nassauSource,
  suffolkSource,
  bergenSource,
];

export function getDataSource(id: SourceRegionId): DataSource | undefined {
  return DATA_SOURCES.find((s) => s.meta.id === id);
}

export function listCoverage() {
  return DATA_SOURCES.map((s) => s.meta);
}
