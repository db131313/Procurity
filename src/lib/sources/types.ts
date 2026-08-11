import type { Project } from "@/lib/db/types";

export type SourceRegionId =
  | "nyc"
  | "westchester"
  | "nassau"
  | "suffolk"
  | "bergen";

export type SourceCoverageStatus = "live" | "limited" | "coming_soon";

export type DataSourceMeta = {
  id: SourceRegionId;
  name: string;
  county: string;
  state: string;
  status: SourceCoverageStatus;
  description: string;
};

export type DataSourceFetchOptions = {
  days?: number;
};

/**
 * Multi-region permit / filing adapter.
 * NYC is live; suburban counties are stubs until open-data feeds exist.
 */
export interface DataSource {
  meta: DataSourceMeta;
  /** Fetch normalized projects for this region. Stubs return []. */
  fetchProjects(opts?: DataSourceFetchOptions): Promise<Project[]>;
}
