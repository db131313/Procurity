import type { Project } from "@/lib/db/types";
import type { DataSource, DataSourceFetchOptions } from "./types";

/**
 * Suffolk County — stub.
 * TODO: No unified open-data permit feed; do not fabricate fake permit data.
 */
export class SuffolkSource implements DataSource {
  meta = {
    id: "suffolk" as const,
    name: "Suffolk",
    county: "Suffolk County",
    state: "NY",
    status: "limited" as const,
    description: "Limited coverage — municipal feeds not wired yet.",
  };

  async fetchProjects(_opts?: DataSourceFetchOptions): Promise<Project[]> {
    // TODO: No unified open data for Suffolk County permits.
    return [];
  }
}

export const suffolkSource = new SuffolkSource();
