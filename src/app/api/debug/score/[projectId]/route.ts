import { NextResponse } from "next/server";
import { getProject } from "@/lib/db/store";
import {
  scoreProject,
  scoreProjectWithPhaseFit,
} from "@/lib/scoring/engine";
import { TRADE_PHASE_FIT, scoreTradeDetailed } from "@/lib/scoring/trades";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await ctx.params;
  const id = decodeURIComponent(projectId);
  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found", id }, { status: 404 });
  }

  const input = {
    phase: project.phase,
    lastActivityAt: project.lastActivityAt,
    estimatedJobCost: project.estimatedJobCost,
    occupancy: project.occupancy,
    buildingType: project.buildingType,
    gcName: project.gcName,
    architectName: project.architectName,
    hasSignPermit: project.hasSignPermit,
    jobType: project.jobType,
  };

  const signage = scoreProject(input);
  const trades = Object.fromEntries(
    (Object.keys(TRADE_PHASE_FIT) as (keyof typeof TRADE_PHASE_FIT)[]).map(
      (trade) => [trade, scoreTradeDetailed(trade, input)],
    ),
  );

  return NextResponse.json({
    projectId: project.id,
    address: project.address,
    storedScore: project.score,
    storedConfidence: project.scoreConfidence,
    recomputed: {
      score: signage.score,
      scoreConfidence: signage.scoreConfidence,
      factorsAvailable: signage.factorsAvailable,
      factorsTotal: signage.factorsTotal,
      factorBreakdown: signage.factorBreakdown,
      scoreReasons: signage.scoreReasons,
    },
    trades: Object.fromEntries(
      Object.entries(trades).map(([k, v]) => [
        k,
        {
          score: v.score,
          confidence: v.scoreConfidence,
          factors: v.factorBreakdown,
        },
      ]),
    ),
    // Convenience: also expose phase-fit table used
    phaseFitTable: scoreProjectWithPhaseFit(input).factorBreakdown.find(
      (f) => f.key === "phaseFit",
    ),
  });
}
