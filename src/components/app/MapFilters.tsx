"use client";

import { useEffect, useState, type ComponentType } from "react";
import {
  Gauge,
  Lightbulb,
  PanelsTopLeft,
  Shield,
  SlidersHorizontal,
  SquarePen,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/cn";

export type MapQuickFilter = "all" | "hot" | "buying" | "new";
export type TradeKey =
  | "signage"
  | "lighting"
  | "glass"
  | "security"
  | "flooring";
/** Single-select score coloring mode for map pins. */
export type ScoreMode = "general" | TradeKey;
export type ScorePreset = "all" | "90+" | "70-89" | "50-69";

export type MapFilterState = {
  quick: MapQuickFilter;
  scoreMode: ScoreMode;
  scorePreset: ScorePreset;
};

export const MAP_FILTERS_KEY = "pc_map_filters";

export const DEFAULT_MAP_FILTERS: MapFilterState = {
  quick: "all",
  scoreMode: "general",
  scorePreset: "all",
};

const QUICK: { id: MapQuickFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "hot", label: "Hot" },
  { id: "buying", label: "Buying Now" },
  { id: "new", label: "New" },
];

type ScoreModeOption = {
  id: ScoreMode;
  label: string;
  Icon: ComponentType<{ className?: string }>;
};

const SCORE_MODES: ScoreModeOption[] = [
  { id: "general", label: "General Score", Icon: Gauge },
  { id: "signage", label: "Signage", Icon: SquarePen },
  { id: "lighting", label: "Lighting", Icon: Lightbulb },
  { id: "glass", label: "Glass/Glazing", Icon: PanelsTopLeft },
  { id: "security", label: "Security", Icon: Shield },
  { id: "flooring", label: "Flooring", Icon: Layers },
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

function isScoreMode(v: unknown): v is ScoreMode {
  return v === "general" || isTradeKey(v);
}

export function scoreModeLabel(mode: ScoreMode): string {
  return SCORE_MODES.find((m) => m.id === mode)?.label ?? "General Score";
}

function parseFilters(raw: unknown): MapFilterState | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Record<string, unknown>;
  const quick = v.quick;
  const scorePreset = v.scorePreset;
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

  let scoreMode: ScoreMode = "general";
  if (v.scoreMode !== undefined) {
    if (!isScoreMode(v.scoreMode)) return null;
    scoreMode = v.scoreMode;
  } else if (Array.isArray(v.trades)) {
    // Migrate legacy multi-select trades → single scoreMode
    if (!v.trades.every(isTradeKey)) return null;
    if (v.trades.length === 1) scoreMode = v.trades[0];
  }

  return { quick, scoreMode, scorePreset };
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
  const [scorePanelOpen, setScorePanelOpen] = useState(false);
  const scoreActive = value.scorePreset !== "all";
  const tradeScoreActive = value.scoreMode !== "general";
  const filterActive = scoreActive;
  const ActiveScoreIcon =
    SCORE_MODES.find((m) => m.id === value.scoreMode)?.Icon ?? Gauge;

  useEffect(() => {
    if (!panelOpen && !scorePanelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPanelOpen(false);
        setScorePanelOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen, scorePanelOpen]);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-30 px-3 md:top-4 md:px-5">
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

        <div className="pointer-events-auto relative z-40 flex shrink-0 gap-2">
          {/* Score mode (General vs single trade) */}
          <div className="relative">
            <button
              type="button"
              aria-expanded={scorePanelOpen}
              aria-controls="map-score-mode-panel"
              aria-label={`Score mode: ${scoreModeLabel(value.scoreMode)}`}
              title={scoreModeLabel(value.scoreMode)}
              onClick={() => {
                setScorePanelOpen((o) => !o);
                setPanelOpen(false);
              }}
              className={cn(
                "flex h-[34px] w-[34px] items-center justify-center rounded-full border shadow-sm backdrop-blur transition",
                tradeScoreActive || scorePanelOpen
                  ? "border-ink/15 bg-ink text-white"
                  : "border-line bg-white/95 text-ink",
              )}
            >
              <ActiveScoreIcon className="h-3.5 w-3.5" />
            </button>

            {scorePanelOpen ? (
              <>
                <button
                  type="button"
                  aria-label="Close score mode"
                  className="fixed inset-0 z-40 cursor-default bg-transparent"
                  onClick={() => setScorePanelOpen(false)}
                />
                <div
                  id="map-score-mode-panel"
                  role="listbox"
                  aria-label="Score mode"
                  className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-1.5rem,15.5rem)] overflow-hidden rounded-2xl border border-line bg-white py-1.5 shadow-xl"
                >
                  {SCORE_MODES.map((m) => {
                    const on = value.scoreMode === m.id;
                    const Icon = m.Icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        role="option"
                        aria-selected={on}
                        onClick={() => {
                          onChange({ ...value, scoreMode: m.id });
                          setScorePanelOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-bold transition",
                          on
                            ? "bg-ink text-white"
                            : "text-ink hover:bg-offwhite",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}
          </div>

          {/* Quick / score-band filters */}
          <div className="relative">
            <button
              type="button"
              aria-expanded={panelOpen}
              aria-controls="map-filter-panel"
              onClick={() => {
                setPanelOpen((o) => !o);
                setScorePanelOpen(false);
              }}
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
                  1
                </span>
              ) : null}
            </button>

            {panelOpen ? (
              <>
                <button
                  type="button"
                  aria-label="Close filters"
                  className="fixed inset-0 z-40 cursor-default bg-transparent"
                  onClick={() => setPanelOpen(false)}
                />
                <div
                  id="map-filter-panel"
                  role="dialog"
                  aria-label="Map filters"
                  className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-1.5rem,20rem)] rounded-2xl border border-line bg-white p-4 shadow-xl"
                >
                  <div>
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

                  {(filterActive ||
                    value.quick !== "all" ||
                    tradeScoreActive) && (
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
    </div>
  );
}
