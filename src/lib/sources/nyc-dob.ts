import { syncDobData } from "@/lib/dob/sync";
import { listProjects } from "@/lib/db/store";
import type { Project } from "@/lib/db/types";
import type { DataSource, DataSourceFetchOptions } from "./types";

/**
 * NYC DOB Open Data adapter — wraps existing sync + store fetch.
 */
export class NycDobSource implements DataSource {
  meta = {
    id: "nyc" as const,
    name: "New York City",
    county: "New York City (5 boroughs)",
    state: "NY",
    status: "live" as const,
    description: "Live DOB NOW + BIS filings via NYC Open Data.",
  };

  async fetchProjects(opts: DataSourceFetchOptions = {}): Promise<Project[]> {
    await syncDobData(opts.days ?? 60);
    return listProjects();
  }
}

export const nycDobSource = new NycDobSource();
