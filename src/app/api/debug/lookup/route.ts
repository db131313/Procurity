import { NextResponse } from "next/server";
import { listProjects } from "@/lib/db/store";
import { readDiscards } from "@/lib/dob/discards";

/**
 * Dev/admin lookup: search ingested projects + recent discard log.
 * GET /api/debug/lookup?q=1166+Manhattan
 */
export async function GET(req: Request) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_DEBUG !== "1"
  ) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  if (!q || q.length < 2) {
    return NextResponse.json(
      { error: "Provide q= address, BIN, or job number" },
      { status: 400 },
    );
  }

  const projects = await listProjects();
  const matches = projects.filter((p) => {
    const hay = [
      p.address,
      p.bin,
      p.jobNumber,
      p.borough,
      p.zip,
      p.id,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q) || q.split(/\s+/).every((tok) => hay.includes(tok));
  });

  const discards = await readDiscards(500);
  const discardHits = discards.filter((d) => {
    const hay = [d.address, d.bin, d.jobKey, d.detail]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q) || q.split(/\s+/).every((tok) => hay.includes(tok));
  });

  return NextResponse.json({
    query: q,
    projectMatches: matches.slice(0, 50).map((p) => ({
      id: p.id,
      address: p.address,
      borough: p.borough,
      bin: p.bin,
      jobNumber: p.jobNumber,
      score: p.score,
      scoreConfidence: p.scoreConfidence,
      phase: p.phase,
      sourceDataset: p.sourceDataset,
      latitude: p.latitude,
      longitude: p.longitude,
    })),
    discardMatches: discardHits.slice(0, 50),
    totals: {
      projectsScanned: projects.length,
      projectHits: matches.length,
      discardHits: discardHits.length,
    },
  });
}
