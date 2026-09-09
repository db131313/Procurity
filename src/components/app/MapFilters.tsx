"use client";

import { useEffect, useState, type ComponentType } from "react";
import {
  Check,
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
  { id: "all", label: "All scores" },
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

/** Large outdoor-readable toggle row (~44px). */
function ToggleRow({
  active,
  label,
  Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  Icon?: ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex min-h-11 w-full items-center gap-3 rounded-xl border-2 px-3.5 text-left text-sm font-bold transition",
        active
          ? "border-ink bg-ink text-white shadow-sm"
          : "border-line bg-white text-ink hover:border-ink/40",
      )}
    >
      {Icon ? <Icon className="h-5 w-5 shrink-0" /> : null}
      <span className="flex-1">{label}</span>
      {active ? <Check className="h-5 w-5 shrink-0" strokeWidth={3} /> : null}
    </button>
  );
}

/**
 * Single map filter control for field use (one-handed / outdoor).
 * Opens one panel with score type + status + score band.
 */
export function MapFilters({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const activeCount =
    (value.quick !== "all" ? 1 : 0) +
    (value.scoreMode !== "general" ? 1 : 0) +
    (value.scorePreset !== "all" ? 1 : 0);
  const anyActive = activeCount > 0;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="pointer-events-none absolute right-3 top-3 z-30 md:right-5 md:top-4">
      <div className="pointer-events-auto relative">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="map-filter-panel"
          aria-label="Map filters"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex h-11 min-w-11 items-center justify-center gap-2 rounded-full border-2 px-3.5 text-sm font-bold shadow-md backdrop-blur transition",
            open || anyActive
              ? "border-ink bg-ink text-white"
              : "border-line bg-white/95 text-ink",
          )}
        >
          <SlidersHorizontal className="h-5 w-5" />
          <span className="pr-0.5">Filters</span>
          {anyActive ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/25 px-1.5 text-[11px] font-bold">
              {activeCount}
            </span>
          ) : null}
        </button>

        {open ? (
          <>
            <button
              type="button"
              aria-label="Close filters"
              className="fixed inset-0 z-30 cursor-default bg-black/20"
              onClick={() => setOpen(false)}
            />
            <div
              id="map-filter-panel"
              role="dialog"
              aria-label="Map filters"
              className="absolute right-0 top-full z-40 mt-2 max-h-[min(70vh,32rem)] w-[min(100vw-1.5rem,20rem)] overflow-y-auto rounded-2xl border-2 border-line bg-white p-4 shadow-xl"
            >
              <section>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate">
                  Status
                </p>
                <div className="space-y-2">
                  {QUICK.map((f) => (
                    <ToggleRow
                      key={f.id}
                      active={value.quick === f.id}
                      label={f.label}
                      onClick={() => onChange({ ...value, quick: f.id })}
                    />
                  ))}
                </div>
              </section>

              <section className="mt-5">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate">
                  Score type
                </p>
                <div className="space-y-2">
                  {SCORE_MODES.map((m) => (
                    <ToggleRow
                      key={m.id}
                      active={value.scoreMode === m.id}
                      label={m.label}
                      Icon={m.Icon}
                      onClick={() => onChange({ ...value, scoreMode: m.id })}
                    />
                  ))}
                </div>
              </section>

              <section className="mt-5">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate">
                  Score band
                </p>
                <div className="space-y-2">
                  {SCORE_PRESETS.map((s) => (
                    <ToggleRow
                      key={s.id}
                      active={value.scorePreset === s.id}
                      label={s.label}
                      onClick={() =>
                        onChange({ ...value, scorePreset: s.id })
                      }
                    />
                  ))}
                </div>
              </section>

              {anyActive ? (
                <button
                  type="button"
                  className="mt-5 flex min-h-11 w-full items-center justify-center rounded-xl border-2 border-line text-sm font-bold text-slate hover:bg-offwhite"
                  onClick={() => {
                    onChange(DEFAULT_MAP_FILTERS);
                    setOpen(false);
                  }}
                >
                  Reset all filters
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
