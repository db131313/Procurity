import type { Project } from "@/lib/db/types";
import type { DataSource, DataSourceFetchOptions } from "./types";

/**
 * Nassau County — stub.
 * TODO: No unified open-data permit feed; do not fabricate fake permit data.
 */
export class NassauSource implements DataSource {
  meta = {
    id: "nassau" as const,
    name: "Nassau",
    county: "Nassau County",
    state: "NY",
    status: "coming_soon" as const,
    description: "Coming soon — no unified open permit API yet.",
  };

  async fetchProjects(_opts?: DataSourceFetchOptions): Promise<Project[]> {
    // TODO: No unified open data for Nassau County permits.
    return [];
  }
}

export const nassauSource = new NassauSource();
