import { NextResponse } from "next/server";
import { getProject } from "@/lib/db/store";
import { projectTeaserLabel } from "@/lib/cities/teaser-label";
import {
  readTeaserViewIds,
  signTeaserViewIds,
  attachTeaserViewCookie,
  TEASER_FREE_VIEWS,
  remainingFreeViews,
} from "@/lib/teaser/view-cookie";

export const dynamic = "force-dynamic";

const TRADE_LABELS = [
  ["signage", "Signage"],
  ["lighting", "Lighting"],
  ["glass", "Glass"],
  ["security", "Security"],
  ["flooring", "Flooring"],
] as const;

function phaseLabel(phase: string): string {
  return phase.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Public project detail for the home map.
 * Never returns contacts, filing numbers, or names.
 * Enforces 3 distinct free views via signed httpOnly cookie.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = (url.searchParams.get("id") || "").trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const viewed = await readTeaserViewIds();
  const already = viewed.includes(id);

  if (!already && viewed.length >= TEASER_FREE_VIEWS) {
    return NextResponse.json(
      {
        ok: false,
        error: "free_limit",
        viewedCount: viewed.length,
        remaining: 0,
        limit: TEASER_FREE_VIEWS,
      },
      { status: 402 },
    );
  }

  const nextIds = already ? viewed : [...viewed, id];
  const trades = project.tradeScores ?? {
    signage: 0,
    lighting: 0,
    glass: 0,
    security: 0,
    flooring: 0,
  };
  const likelyNeeds = TRADE_LABELS.filter(([key]) => trades[key] >= 55).map(
    ([key, label]) => ({ trade: label, score: trades[key] }),
  );

  // Explicit allow-list — never leak contacts / filing numbers / names
  const detail = {
    id: project.id,
    address: project.address
      .replace(/\b(suite|ste|unit|apt|#)\s*[\w-]+/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim(),
    projectType: projectTeaserLabel(
      project.jobType,
      project.occupancy,
      project.buildingType,
    ),
    phase: project.phase,
    phaseLabel: phaseLabel(project.phase),
    score: project.score,
    scoreReasons: (project.scoreReasons?.length
      ? project.scoreReasons
      : [
          "Timing and project type look like a good outreach moment",
          "Commercial project size fits typical trade scope",
        ]
    ).slice(0, 4),
    valueLow: project.estValueLow || 0,
    valueHigh: project.estValueHigh || 0,
    likelyNeeds:
      likelyNeeds.length > 0
        ? likelyNeeds
        : [{ trade: "General trade fit", score: project.score }],
  };

  const response = NextResponse.json({
    ok: true,
    detail,
    viewedCount: nextIds.length,
    remaining: remainingFreeViews(nextIds),
    limit: TEASER_FREE_VIEWS,
  });

  if (!already) {
    const token = await signTeaserViewIds(nextIds);
    attachTeaserViewCookie(response, token);
  }

  return response;
}
