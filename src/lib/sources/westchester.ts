import type { Project } from "@/lib/db/types";
import type { DataSource, DataSourceFetchOptions } from "./types";

/**
 * Westchester County — stub.
 * TODO: No unified open-data permit feed; do not fabricate fake permit data.
 */
export class WestchesterSource implements DataSource {
  meta = {
    id: "westchester" as const,
    name: "Westchester",
    county: "Westchester County",
    state: "NY",
    status: "coming_soon" as const,
    description: "Coming soon — no unified open permit API yet.",
  };

  async fetchProjects(_opts?: DataSourceFetchOptions): Promise<Project[]> {
    // TODO: No unified open data for Westchester County permits.
    return [];
  }
}

export const westchesterSource = new WestchesterSource();
