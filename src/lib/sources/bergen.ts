import type { Project } from "@/lib/db/types";
import type { DataSource, DataSourceFetchOptions } from "./types";

/**
 * Bergen County (NJ) — stub.
 * TODO: No unified open-data permit feed; do not fabricate fake permit data.
 */
export class BergenSource implements DataSource {
  meta = {
    id: "bergen" as const,
    name: "Bergen",
    county: "Bergen County",
    state: "NJ",
    status: "coming_soon" as const,
    description: "Coming soon — no unified open permit API yet.",
  };

  async fetchProjects(_opts?: DataSourceFetchOptions): Promise<Project[]> {
    // TODO: No unified open data for Bergen County permits.
    return [];
  }
}

export const bergenSource = new BergenSource();
