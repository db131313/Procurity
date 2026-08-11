import Link from "next/link";
import { ScoreRing } from "@/components/ui/ScoreRing";
import type { Project } from "@/lib/db/types";
import { PHASE_LABELS } from "@/lib/db/types";
import { formatMoneyRange } from "@/lib/format";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/app/project/${encodeURIComponent(project.id)}`}
      className="pc-card block p-4 transition hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <ScoreRing score={project.score} size={56} stroke={5} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-purple">
            {project.score >= 90
              ? "Hot opportunity"
              : PHASE_LABELS[project.phase]}
          </p>
          <p className="mt-0.5 truncate text-base font-bold text-ink">
            {project.address}
          </p>
          <p className="truncate text-sm text-slate">
            {[project.borough, project.zip].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-offwhite px-2.5 py-1 text-[11px] font-bold text-ink">
          {formatMoneyRange(project.estValueLow, project.estValueHigh)}
        </span>
        <span className="rounded-full bg-offwhite px-2.5 py-1 text-[11px] font-bold text-ink">
          {project.buyingWindowEstimate}
        </span>
      </div>
    </Link>
  );
}
