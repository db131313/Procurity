"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";

export type MapQuickFilter = "all" | "hot" | "buying" | "new";
export type TradeKey =
  | "signage"
  | "lighting"
  | "glass"
  | "security"
  | "flooring";
export type ScorePreset = "all" | "90+" | "70-89" | "50-69";

export type MapFilterState = {
  quick: MapQuickFilter;
  trades: TradeKey[];
  scorePreset: ScorePreset;
};

export const MAP_FILTERS_KEY = "pc_map_filters";

export const DEFAULT_MAP_FILTERS: MapFilterState = {
  quick: "all",
  trades: [],
  scorePreset: "all",
};

const QUICK: { id: MapQuickFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "hot", label: "Hot" },
  { id: "buying", label: "Buying Now" },
  { id: "new", label: "New" },
];

const TRADES: { id: TradeKey; label: string }[] = [
  { id: "signage", label: "Signage" },
  { id: "lighting", label: "Lighting" },
  { id: "glass", label: "Glass" },
  { id: "security", label: "Security" },
  { id: "flooring", label: "Flooring" },
];

const SCORE_PRESETS: { id: ScorePreset; label: string }[] = [
  { id: "all", label: "All" },
  { id: "90+", label: "90+" },
  { id: "70-89", label: "70–89" },
  { id: "50-69", label: "50–69" },
];

function isTradeKey(v: unknown): v is TradeKey {
  return (
    v === "signage" ||
    v === "lighting" ||
    v === "glass" ||
    v === "security" ||
    v === "flooring"
  );
}

function parseFilters(raw: unknown): MapFilterState | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Record<string, unknown>;
  const quick = v.quick;
  const scorePreset = v.scorePreset;
  const trades = v.trades;
  if (
    quick !== "all" &&
    quick !== "hot" &&
    quick !== "buying" &&
    quick !== "new"
  ) {
    return null;
  }
  if (
    scorePreset !== "all" &&
    scorePreset !== "90+" &&
    scorePreset !== "70-89" &&
    scorePreset !== "50-69"
  ) {
    return null;
  }
  if (!Array.isArray(trades) || !trades.every(isTradeKey)) return null;
  return { quick, trades, scorePreset };
}

export function getMapFilters(): MapFilterState {
  if (typeof window === "undefined") return DEFAULT_MAP_FILTERS;
  try {
    const raw = window.sessionStorage.getItem(MAP_FILTERS_KEY);
    if (!raw) return DEFAULT_MAP_FILTERS;
    return parseFilters(JSON.parse(raw)) ?? DEFAULT_MAP_FILTERS;
  } catch {
    return DEFAULT_MAP_FILTERS;
  }
}

export function setMapFilters(state: MapFilterState): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(MAP_FILTERS_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

type Props = {
  value: MapFilterState;
  onChange: (next: MapFilterState) => void;
};

export function MapFilters({ value, onChange }: Props) {
  const [panelOpen, setPanelOpen] = useState(false);
  const tradeActive = value.trades.length > 0;
  const scoreActive = value.scorePreset !== "all";
  const filterActive = tradeActive || scoreActive;

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanelOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  function toggleTrade(id: TradeKey) {
    const next = value.trades.includes(id)
      ? value.trades.filter((t) => t !== id)
      : [...value.trades, id];
    onChange({ ...value, trades: next });
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-12 z-20 px-3 md:top-14 md:px-5">
      <div className="flex items-start gap-2">
        <div className="pointer-events-auto flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
          {QUICK.map((f) => {
            const active = value.quick === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onChange({ ...value, quick: f.id })}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition",
                  active
                    ? "pc-gradient-bg text-white shadow-md"
                    : "border border-line bg-white/95 text-ink shadow-sm backdrop-blur",
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="pointer-events-auto relative shrink-0">
          <button
            type="button"
            aria-expanded={panelOpen}
            aria-controls="map-filter-panel"
            onClick={() => setPanelOpen((o) => !o)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold shadow-sm backdrop-blur transition",
              filterActive || panelOpen
                ? "border-ink/15 bg-ink text-white"
                : "border-line bg-white/95 text-ink",
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filter
            {filterActive ? (
              <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white/20 px-1 text-[10px]">
                {(tradeActive ? 1 : 0) + (scoreActive ? 1 : 0)}
              </span>
            ) : null}
          </button>

          {panelOpen ? (
            <>
              <button
                type="button"
                aria-label="Close filters"
                className="fixed inset-0 z-30 cursor-default bg-transparent"
                onClick={() => setPanelOpen(false)}
              />
              <div
                id="map-filter-panel"
                role="dialog"
                aria-label="Map filters"
                className="absolute right-0 top-full z-40 mt-2 w-[min(100vw-1.5rem,20rem)] rounded-2xl border border-line bg-white p-4 shadow-xl"
              >
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate">
                    Trades
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {TRADES.map((t) => {
                      const on = value.trades.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleTrade(t.id)}
                          className={cn(
                            "rounded-full px-3 py-1.5 text-xs font-bold transition",
                            on
                              ? "bg-ink text-white"
                              : "bg-offwhite text-ink hover:bg-line/60",
                          )}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate">
                    Score
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {SCORE_PRESETS.map((s) => {
                      const on = value.scorePreset === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() =>
                            onChange({ ...value, scorePreset: s.id })
                          }
                          className={cn(
                            "rounded-full px-3 py-1.5 text-xs font-bold transition",
                            on
                              ? "bg-ink text-white"
                              : "bg-offwhite text-ink hover:bg-line/60",
                          )}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {(filterActive || value.quick !== "all") && (
                  <button
                    type="button"
                    className="mt-4 w-full rounded-full border border-line py-2 text-xs font-bold text-slate hover:bg-offwhite"
                    onClick={() => {
                      onChange(DEFAULT_MAP_FILTERS);
                      setPanelOpen(false);
                    }}
                  >
                    Reset filters
                  </button>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
