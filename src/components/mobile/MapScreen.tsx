"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { PhoneShell } from "@/components/mobile/PhoneShell";
import type { OpportunityView } from "@/lib/opportunity";
import { toOpportunity } from "@/lib/opportunity";
import type { Top20Response } from "@/lib/types";

const MobileMap = dynamic(
  () => import("@/components/mobile/MobileMap").then((m) => m.MobileMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-pc-mist text-sm text-pc-slate">
        Loading map…
      </div>
    ),
  },
);

const FILTERS = [
  { id: "all", label: "All" },
  { id: "hot", label: "Hot" },
  { id: "buying", label: "Buying Now" },
  { id: "new", label: "New" },
] as const;

const BOROUGHS = ["All NYC", "Brooklyn", "Manhattan", "Queens", "Bronx", "Staten Island"];

type Props = {
  initial: Top20Response;
};

export function MapScreen({ initial }: Props) {
  const [sites, setSites] = useState(initial.sites);
  const [borough, setBorough] = useState(initial.boroughFilter || "All NYC");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(
    initial.sites[0]?.id ?? null,
  );
  const [pending, startTransition] = useTransition();

  const opportunities = useMemo(
    () => sites.map((s, i) => toOpportunity(s, i)),
    [sites],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return opportunities;
    return opportunities.filter((o) => o.heat === filter || (filter === "hot" && o.probabilityScore >= 78));
  }, [opportunities, filter]);

  const selected =
    filtered.find((o) => o.id === selectedId) || filtered[0] || null;

  function refreshBorough(next: string) {
    setBorough(next);
    startTransition(async () => {
      const params = new URLSearchParams();
      if (next !== "All NYC") params.set("borough", next);
      const res = await fetch(`/api/intel/top20?${params}`);
      if (!res.ok) return;
      const data = (await res.json()) as Top20Response;
      setSites(data.sites);
      setSelectedId(data.sites[0]?.id ?? null);
    });
  }

  return (
    <PhoneShell>
      <div className="relative h-[100dvh] max-h-[100dvh] overflow-hidden bg-white">
        <div className="absolute inset-0 bottom-[210px]">
          <MobileMap
            sites={filtered}
            selectedId={selected?.id}
            onSelect={setSelectedId}
          />
        </div>

        {/* top chrome */}
        <div className="absolute inset-x-0 top-0 z-20 px-4 pt-4">
          <div className="flex items-center gap-2 rounded-2xl bg-white/95 p-2 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-pc-mist text-pc-ink"
              aria-label="Menu"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 7h14M5 12h14M5 17h14" strokeLinecap="round" />
              </svg>
            </button>
            <label className="flex flex-1 items-center gap-2 px-1 text-sm font-semibold text-pc-ink">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-pc-purple" fill="currentColor">
                <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z" />
              </svg>
              <select
                value={borough}
                onChange={(e) => refreshBorough(e.target.value)}
                className="w-full bg-transparent outline-none"
              >
                {BOROUGHS.map((b) => (
                  <option key={b} value={b}>
                    {b === "All NYC" ? "New York, NY" : `${b}, NY`}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-pc-mist text-pc-ink"
              aria-label="Filters"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "pc-gradient-bg text-white shadow-md"
                      : "bg-white text-pc-ink shadow-sm"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          {pending ? (
            <p className="mt-2 text-xs font-medium text-pc-slate">Refreshing intel…</p>
          ) : null}
        </div>

        {/* preview card */}
        {selected ? (
          <LeadPreviewCard site={selected} />
        ) : (
          <div className="absolute inset-x-4 bottom-[92px] z-20 rounded-3xl bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
            <p className="text-sm text-pc-slate">No opportunities in this filter.</p>
          </div>
        )}
      </div>
    </PhoneShell>
  );
}

function LeadPreviewCard({ site }: { site: OpportunityView }) {
  return (
    <Link
      href={`/opportunity/${encodeURIComponent(site.id)}`}
      className="absolute inset-x-4 bottom-[92px] z-20 block overflow-hidden rounded-3xl bg-white shadow-[0_18px_40px_rgba(15,23,42,0.16)] animate-pc-pop"
    >
      <div className="flex gap-3 p-3">
        <div
          className="h-[88px] w-[88px] shrink-0 rounded-2xl"
          style={{
            background:
              "linear-gradient(145deg, rgba(124,58,237,0.18), rgba(45,212,191,0.25)), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect fill='%23e2e8f0' width='80' height='80'/%3E%3Cpath fill='%23cbd5e1' d='M0 50h80v30H0z'/%3E%3Crect x='18' y='20' width='20' height='40' fill='%2394a3b8'/%3E%3Crect x='44' y='10' width='18' height='50' fill='%237c3aed' opacity='.55'/%3E%3C/svg%3E\") center/cover",
          }}
        />
        <div className="min-w-0 flex-1 py-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[17px] font-bold text-pc-ink">{site.title}</p>
              <p className="mt-0.5 truncate text-xs text-pc-slate">
                {site.address} · {site.distanceLabel}
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full pc-gradient-bg text-sm font-bold text-white">
              {site.probabilityScore}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-pc-mist px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-pc-slate">
                Est. Opportunity
              </p>
              <p className="text-xs font-bold text-pc-ink">{site.estOpportunity}</p>
            </div>
            <div className="rounded-xl bg-pc-mist px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-pc-slate">
                Buying Window
              </p>
              <p className="text-xs font-bold text-pc-ink">{site.buyingWindow}</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
