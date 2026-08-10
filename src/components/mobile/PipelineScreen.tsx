"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { PhoneShell } from "@/components/mobile/PhoneShell";
import {
  markDealWon,
  readPipeline,
  type PipelineDeal,
} from "@/lib/pipeline";

const pipelineListeners = new Set<() => void>();
function subscribePipeline(cb: () => void) {
  pipelineListeners.add(cb);
  return () => {
    pipelineListeners.delete(cb);
  };
}
function emitPipeline() {
  pipelineListeners.forEach((cb) => cb());
}
function getPipelineSnapshot(): PipelineDeal[] {
  return readPipeline();
}
function getServerPipelineSnapshot(): PipelineDeal[] {
  return [];
}

export function PipelineScreen() {
  const deals = useSyncExternalStore(
    subscribePipeline,
    getPipelineSnapshot,
    getServerPipelineSnapshot,
  );
  const [wonId, setWonId] = useState<string | null>(null);

  useEffect(() => {
    emitPipeline();
  }, []);

  const wonDeal = useMemo(
    () => deals.find((d) => d.id === wonId && d.status === "won") || null,
    [deals, wonId],
  );

  const stats = useMemo(() => {
    const won = deals.filter((d) => d.status === "won");
    const total = won.reduce((sum, d) => sum + (d.wonValue || 0), 0);
    const rate = deals.length ? Math.round((won.length / deals.length) * 100) : 0;
    return { total, rate, count: won.length };
  }, [deals]);

  if (wonDeal) {
    return (
      <PhoneShell showNav={false}>
        <DealWon
          deal={wonDeal}
          winRate={stats.rate || 25}
          totalWon={stats.total || wonDeal.wonValue || 18500}
          onClose={() => setWonId(null)}
        />
      </PhoneShell>
    );
  }

  return (
    <PhoneShell>
      <main className="min-h-[100dvh] bg-white px-5 pb-8 pt-6">
        <h1 className="text-2xl font-bold text-pc-ink">Pipeline</h1>
        <p className="mt-1 text-sm text-pc-slate">
          Opportunities you&apos;re actively working.
        </p>

        {deals.length === 0 ? (
          <div className="mt-10 rounded-3xl bg-pc-mist p-6 text-center">
            <p className="font-semibold text-pc-ink">No deals yet</p>
            <p className="mt-1 text-sm text-pc-slate">
              Open the map and add a hot opportunity to your pipeline.
            </p>
            <Link
              href="/map"
              className="pc-gradient-bg mt-5 inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-bold text-white"
            >
              Find opportunities
            </Link>
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {deals.map((deal) => (
              <li key={deal.id} className="rounded-3xl border border-pc-line p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-pc-purple">
                      {deal.status === "won" ? "Won" : "Active"}
                    </p>
                    <p className="mt-1 text-lg font-bold text-pc-ink">{deal.title}</p>
                    <p className="text-sm text-pc-slate">
                      {deal.address}, {deal.borough}
                    </p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-pc-mist text-sm font-bold text-pc-purple">
                    {deal.score}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-pc-slate">
                    {deal.status === "won"
                      ? `Closed $${(deal.wonValue || 0).toLocaleString()}`
                      : deal.estOpportunity}
                  </span>
                  {deal.status === "active" ? (
                    <button
                      type="button"
                      onClick={() => {
                        markDealWon(deal.id, 18500);
                        emitPipeline();
                        setWonId(deal.id);
                      }}
                      className="rounded-full bg-pc-ink px-3 py-1.5 text-xs font-bold text-white"
                    >
                      Mark won
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </PhoneShell>
  );
}

function DealWon({
  deal,
  winRate,
  totalWon,
  onClose,
}: {
  deal: PipelineDeal;
  winRate: number;
  totalWon: number;
  onClose: () => void;
}) {
  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-white px-6 pb-10 pt-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 overflow-hidden">
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="absolute top-0 h-2 w-2 rounded-full"
            style={{
              left: `${6 + ((i * 17) % 90)}%`,
              background: i % 2 ? "#8B5CF6" : "#2DD4BF",
              animation: `pc-confetti ${1.6 + (i % 5) * 0.2}s ease-in ${i * 0.05}s both`,
            }}
          />
        ))}
      </div>

      <div className="mx-auto mt-8 flex h-24 w-24 items-center justify-center rounded-full bg-sky-100 animate-pc-pop">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-500 text-3xl text-white">
          ✓
        </div>
      </div>

      <h1 className="mt-6 text-center text-3xl font-bold text-pc-ink">Deal Won!</h1>
      <p className="mt-2 text-center text-sm text-pc-slate">
        {deal.title}
        <br />
        {deal.address}, {deal.borough}
      </p>

      <p className="mt-8 text-center text-4xl font-bold tracking-tight text-sky-600">
        ${(deal.wonValue || 18500).toLocaleString()}
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-pc-mist p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-pc-slate">
            Win Rate
          </p>
          <p className="mt-1 text-2xl font-bold text-pc-ink">{winRate}%</p>
        </div>
        <div className="rounded-2xl bg-pc-mist p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-pc-slate">
            Total Won
          </p>
          <p className="mt-1 text-2xl font-bold text-pc-ink">
            ${totalWon.toLocaleString()}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="pc-gradient-bg mt-auto flex h-14 w-full items-center justify-center rounded-full text-[16px] font-bold text-white"
      >
        View Deal Summary
      </button>
      <button
        type="button"
        onClick={onClose}
        className="mt-3 text-center text-sm font-semibold text-pc-purple"
      >
        Share the Win
      </button>
    </main>
  );
}
