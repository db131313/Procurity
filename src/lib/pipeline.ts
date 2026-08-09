"use client";

import type { OpportunityView } from "./opportunity";

export type PipelineDeal = {
  id: string;
  title: string;
  address: string;
  borough: string;
  score: number;
  estOpportunity: string;
  status: "active" | "won";
  wonValue?: number;
  addedAt: string;
};

const KEY = "procurity.pipeline.v1";

export function readPipeline(): PipelineDeal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PipelineDeal[]) : [];
  } catch {
    return [];
  }
}

export function writePipeline(deals: PipelineDeal[]) {
  localStorage.setItem(KEY, JSON.stringify(deals));
}

export function addToPipeline(opp: OpportunityView) {
  const deals = readPipeline();
  if (deals.some((d) => d.id === opp.id)) return deals;
  const next: PipelineDeal[] = [
    {
      id: opp.id,
      title: opp.title,
      address: opp.address,
      borough: opp.borough,
      score: opp.probabilityScore,
      estOpportunity: opp.estOpportunity,
      status: "active",
      addedAt: new Date().toISOString(),
    },
    ...deals,
  ];
  writePipeline(next);
  return next;
}

export function markDealWon(id: string, value = 18500) {
  const deals = readPipeline().map((d) =>
    d.id === id ? { ...d, status: "won" as const, wonValue: value } : d,
  );
  writePipeline(deals);
  return deals;
}
