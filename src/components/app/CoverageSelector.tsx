import { listCoverage } from "@/lib/sources";
import type { SourceCoverageStatus } from "@/lib/sources";

const STATUS_LABEL: Record<SourceCoverageStatus, string> = {
  live: "Live",
  limited: "Partial coverage",
  coming_soon: "Coming soon",
};

const STATUS_CLASS: Record<SourceCoverageStatus, string> = {
  live: "bg-success/15 text-success",
  limited: "bg-warning/15 text-warning",
  coming_soon: "bg-offwhite text-slate",
};

/**
 * County / metro coverage selector for settings / map.
 * Lists live NYC + scaffolded US cities and suburban counties.
 */
export function CoverageSelector() {
  const regions = listCoverage();

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate">
        City & county coverage
      </p>
      <p className="mt-1 text-sm text-slate">
        Choose where Procurity pulls permit intelligence. Stub regions return
        no fabricated data until an open feed is wired.
      </p>
      <ul className="mt-4 space-y-2">
        {regions.map((r) => (
          <li
            key={r.id}
            className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-offwhite/80 px-3.5 py-3"
          >
            <div className="min-w-0">
              <p className="font-bold text-ink">
                {r.name}
                <span className="ml-1.5 text-xs font-semibold text-slate">
                  {r.state}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-slate">{r.description}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_CLASS[r.status]}`}
            >
              {STATUS_LABEL[r.status]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
