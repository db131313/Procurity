import { getPrisma, isDatabaseConfigured } from "@/lib/db/prisma";
import { getSyncMeta, listProjects } from "@/lib/db/store";
import { PICKER_CITIES } from "@/lib/cities/picker";

export type HomeCoverageStats = {
  projectCount: number;
  cityCount: number;
  cities: { id: string; label: string; count: number }[];
  source: "database" | "file" | "fallback";
  /** ISO timestamp of last permit sync, when known */
  lastSyncAt: string | null;
};

const SERVED = PICKER_CITIES.filter((c) => c.served && c.cityCode);

/**
 * Live coverage numbers for the marketing home data-proof section.
 * Never throws — falls back to zeros so the homepage always paints.
 */
export async function getHomeCoverageStats(): Promise<HomeCoverageStats> {
  try {
    const meta = await getSyncMeta().catch(() => ({
      lastSyncAt: null as string | null,
      projectCount: 0,
    }));

    if (isDatabaseConfigured()) {
      const prisma = getPrisma();
      const grouped = await prisma.project.groupBy({
        by: ["city"],
        _count: { _all: true },
      });
      const byCity = new Map(
        grouped.map((g) => [g.city, g._count._all] as const),
      );
      const cities = SERVED.map((c) => ({
        id: c.id,
        label: c.shortLabel,
        count: byCity.get(c.cityCode!) ?? 0,
      })).filter((c) => c.count > 0);
      const projectCount = grouped.reduce((n, g) => n + g._count._all, 0);
      return {
        projectCount,
        cityCount: cities.length || SERVED.length,
        cities,
        source: "database",
        lastSyncAt: meta.lastSyncAt,
      };
    }

    const projects = await listProjects();
    const byCity = new Map<string, number>();
    for (const p of projects) {
      byCity.set(p.city, (byCity.get(p.city) ?? 0) + 1);
    }
    const cities = SERVED.map((c) => ({
      id: c.id,
      label: c.shortLabel,
      count: byCity.get(c.cityCode!) ?? 0,
    })).filter((c) => c.count > 0);
    return {
      projectCount: meta.projectCount || projects.length,
      cityCount: cities.length || SERVED.length,
      cities,
      source: "file",
      lastSyncAt: meta.lastSyncAt,
    };
  } catch (err) {
    console.warn("[home] coverage stats failed", err);
    return {
      projectCount: 0,
      cityCount: SERVED.length,
      cities: [],
      source: "fallback",
      lastSyncAt: null,
    };
  }
}
