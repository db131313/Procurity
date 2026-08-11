import Link from "next/link";
import { notFound } from "next/navigation";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { StatusChip } from "@/components/ui/StatusChip";
import { getCurrentUser } from "@/lib/auth/session";
import { getProject, listPipeline } from "@/lib/db/store";
import { PHASE_LABELS } from "@/lib/db/types";
import {
  formatMoneyRange,
  relativeTime,
  scoreBandLabel,
} from "@/lib/format";
import { recommendSolutions } from "@/lib/scoring/engine";
import { addAndMaybeRedirect } from "@/app/actions/pipeline";
import { WhyScore } from "./WhyScore";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(decodeURIComponent(id));
  if (!project) notFound();

  const user = await getCurrentUser();
  const pipeline = user ? await listPipeline(user.id) : [];
  const inPipeline = pipeline.some((p) => p.projectId === project.id);

  // Heuristic product recommendations — not literal DOB data.
  const solutions = recommendSolutions(project.phase, project.occupancy);

  return (
    <main className="px-5 py-6 md:mx-auto md:max-w-2xl md:px-8 md:py-8">
      <Link
        href="/app/map"
        className="text-sm font-semibold text-purple hover:underline"
      >
        ← Back to map
      </Link>

      <div className="mt-5 flex items-start gap-4">
        <ScoreRing score={project.score} size={88} stroke={7} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-hot">
            {scoreBandLabel(project.score)}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
            {project.address}
          </h1>
          <p className="mt-1 text-sm text-slate">
            {[project.borough, project.zip].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink shadow-sm ring-1 ring-line">
          {formatMoneyRange(project.estValueLow, project.estValueHigh)}
        </span>
        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink shadow-sm ring-1 ring-line">
          Window {project.buyingWindowEstimate}
        </span>
      </div>

      <div className="mt-4 text-sm text-slate">
        <span className="font-semibold text-ink">
          {PHASE_LABELS[project.phase]}
        </span>
        {" · "}
        Last activity {relativeTime(project.lastActivityAt)}
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate">
          Checklist
        </h2>
        <div className="mt-3 space-y-2">
          <StatusChip status={project.gcName ? "confirmed" : "missing"}>
            GC{project.gcName ? `: ${project.gcName}` : ""}
          </StatusChip>
          <StatusChip status={project.architectName ? "confirmed" : "missing"}>
            Architect
            {project.architectName ? `: ${project.architectName}` : ""}
          </StatusChip>
          <StatusChip status={project.hasSignPermit ? "confirmed" : "pending"}>
            Signage provider
            {project.hasSignPermit
              ? " — sign permit filed"
              : " — no SG permit yet"}
          </StatusChip>
        </div>
      </section>

      <form action={addAndMaybeRedirect} className="mt-6">
        <input type="hidden" name="projectId" value={project.id} />
        <button
          type="submit"
          disabled={inPipeline}
          className="pc-gradient-bg flex h-14 w-full items-center justify-center rounded-full text-sm font-bold text-white disabled:opacity-50"
        >
          {inPipeline ? "Already in pipeline" : "Add to Pipeline"}
        </button>
      </form>

      <WhyScore score={project.score} reasons={project.scoreReasons} />

      <section className="mt-8">
        <h2 className="text-lg font-bold text-ink">Likely Solutions</h2>
        <p className="mt-1 text-xs text-slate">
          Heuristic suggestions based on phase and occupancy — not DOB filings.
        </p>
        <ul className="mt-4 space-y-3">
          {solutions.map((s) => (
            <li key={s.name} className="pc-card p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-bold text-ink">{s.name}</p>
                <span className="shrink-0 rounded-full bg-offwhite px-2.5 py-1 text-[11px] font-bold text-purple">
                  {s.probability}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate">{s.blurb}</p>
            </li>
          ))}
        </ul>
      </section>

      {project.description && (
        <section className="mt-8 pb-8">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate">
            Filing notes
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink">
            {project.description}
          </p>
        </section>
      )}
    </main>
  );
}
