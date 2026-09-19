import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getProject, listPipeline } from "@/lib/db/store";
import { PHASE_LABELS } from "@/lib/db/types";
import { recommendSourcing } from "@/lib/scoring/engine";
import { buildProcurementLeads } from "@/lib/projects/leads";
import { getSyncMeta } from "@/lib/db/store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const project = await getProject(decodeURIComponent(id));
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const pipeline = await listPipeline(user.id);
  const inPipeline = pipeline.some((p) => p.projectId === project.id);
  const sourcing = recommendSourcing({
    tradeScores: project.tradeScores,
    phase: project.phase,
    lastActivityAt: project.lastActivityAt,
    scoreReasons: project.scoreReasons,
  });
  const leads = buildProcurementLeads(project);
  const sync = await getSyncMeta();

  return NextResponse.json({
    ok: true,
    project: {
      ...project,
      phaseLabel: PHASE_LABELS[project.phase],
    },
    inPipeline,
    sourcing,
    leads,
    lastSyncAt: sync.lastSyncAt,
  });
}
