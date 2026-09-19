"use client";

import { useEffect, useState, useTransition } from "react";
import { StreetViewHeader } from "@/components/app/StreetViewHeader";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { StatusChip } from "@/components/ui/StatusChip";
import { DataFreshnessBadge } from "@/components/ui/DataFreshnessBadge";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { formatMoneyRange, relativeTime, scoreBandLabel } from "@/lib/format";
import { addProjectToPipeline } from "@/app/actions/pipeline";
import type { ProcurementLead } from "@/lib/projects/leads";
import { searchLink } from "@/lib/projects/leads";
import type { ProjectPhase, TradeScores } from "@/lib/db/types";

function pinColorForScore(score: number): string {
  if (score >= 90) return "#16A34A";
  if (score >= 80) return "#0D9488";
  if (score >= 70) return "#2563EB";
  if (score >= 60) return "#D97706";
  return "#64748B";
}

type OverlayProject = {
  id: string;
  address: string;
  borough?: string | null;
  zip?: string | null;
  latitude: number;
  longitude: number;
  score: number;
  scoreConfidence?: "high" | "medium" | "low";
  estValueLow: number;
  estValueHigh: number;
  buyingWindowEstimate: string;
  phase: ProjectPhase;
  phaseLabel?: string;
  lastActivityAt?: string;
  tradeScores?: TradeScores;
  scoreReasons?: string[];
  gcName?: string | null;
  architectName?: string | null;
  hasSignPermit?: boolean;
  description?: string | null;
};

type DetailPayload = {
  project: OverlayProject & {
    phaseLabel: string;
    lastActivityAt: string;
    tradeScores: TradeScores;
    scoreReasons: string[];
    gcName: string | null;
    architectName: string | null;
    hasSignPermit: boolean;
    description: string | null;
  };
  inPipeline: boolean;
  sourcing: { trade: string; score: number; reason: string }[];
  leads: ProcurementLead[];
  lastSyncAt: string | null;
};

type Props = {
  project: OverlayProject | null;
  open: boolean;
  onClose: () => void;
  /** Pin score already adjusted for trade filter mode */
  displayScore: number;
};

function scoreBand(score: number) {
  if (score >= 90) return "Hot · 90+";
  if (score >= 80) return "Strong · 80–89";
  if (score >= 70) return "Solid · 70–79";
  if (score >= 60) return "Warm · 60–69";
  return "Watch · <60";
}

export function ProjectDetailOverlay({
  project,
  open,
  onClose,
  displayScore,
}: Props) {
  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!open || !project?.id) {
      setDetail(null);
      setLoadError(null);
      setAdded(false);
      return;
    }
    const projectId = project.id;
    let cancelled = false;
    setDetail(null);
    setLoadError(null);
    setAdded(false);
    void fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
      credentials: "same-origin",
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error || `Failed (${res.status})`);
        }
        return (await res.json()) as DetailPayload & { ok?: boolean };
      })
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Load failed");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, project?.id]);

  const p = detail?.project;
  const inPipeline = Boolean(detail?.inPipeline || added);
  const streetLat = p?.latitude ?? project?.latitude ?? 0;
  const streetLng = p?.longitude ?? project?.longitude ?? 0;
  const hasStreetCoords =
    Number.isFinite(streetLat) &&
    Number.isFinite(streetLng) &&
    !(streetLat === 0 && streetLng === 0);

  return (
    <BottomSheet open={open && Boolean(project)} onClose={onClose} variant="full">
      {project && (
        <>
          {hasStreetCoords ? (
            <StreetViewHeader
              lat={streetLat}
              lng={streetLng}
              className="w-full"
            />
          ) : (
            <div className="flex h-56 w-full items-center justify-center bg-ink text-xs font-semibold text-white/70 sm:h-72 md:h-80">
              Loading location…
            </div>
          )}

          <div className="px-4 pt-4">
            <div className="flex items-start gap-3">
              <ScoreRing score={displayScore} size={68} stroke={5} />
              <div className="min-w-0 flex-1">
                <p
                  className="text-[11px] font-bold uppercase tracking-wide"
                  style={{ color: pinColorForScore(displayScore) }}
                >
                  {scoreBand(displayScore)}
                  {p ? ` · ${scoreBandLabel(p.score)}` : ""}
                </p>
                <p className="mt-0.5 text-lg font-bold leading-snug text-ink">
                  {project.address}
                </p>
                <p className="mt-1 text-sm text-slate">
                  {[project.borough, project.zip].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {formatMoneyRange(project.estValueLow, project.estValueHigh)}
                  <span className="font-normal text-slate">
                    {" "}
                    · {project.buyingWindowEstimate}
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-3">
              <DataFreshnessBadge
                iso={detail?.lastSyncAt}
                label="Permit data"
                variant="panel"
              />
            </div>

            {!detail && !loadError && (
              <p className="mt-6 text-sm font-semibold text-slate">
                Loading project detail…
              </p>
            )}
            {loadError && (
              <p className="mt-6 rounded-xl border border-dashed border-line bg-offwhite px-3 py-3 text-sm text-slate">
                Couldn’t load full detail ({loadError}). Map preview still
                available.
              </p>
            )}

            {p && (
              <>
                <div className="mt-4 text-sm text-slate">
                  <span className="font-semibold text-ink">{p.phaseLabel}</span>
                  {" · "}
                  Last activity {relativeTime(p.lastActivityAt)}
                </div>

                <section className="mt-5">
                  <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate">
                    Trade scores
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(
                      [
                        ["signage", p.tradeScores.signage, true],
                        ["lighting", p.tradeScores.lighting, false],
                        ["glass", p.tradeScores.glass, false],
                        ["security", p.tradeScores.security, false],
                        ["flooring", p.tradeScores.flooring, false],
                      ] as const
                    ).map(([label, value, primary]) => (
                      <span
                        key={label}
                        className={
                          primary
                            ? "rounded-full bg-purple px-3 py-1.5 text-xs font-bold capitalize text-white"
                            : "rounded-full bg-offwhite px-2.5 py-1 text-[11px] font-bold capitalize text-ink ring-1 ring-line"
                        }
                      >
                        {label} {value}
                      </span>
                    ))}
                  </div>
                </section>

                <section className="mt-5 space-y-2">
                  <StatusChip status={p.gcName ? "confirmed" : "missing"}>
                    GC{p.gcName ? `: ${p.gcName}` : ""}
                  </StatusChip>
                  <StatusChip
                    status={p.architectName ? "confirmed" : "missing"}
                  >
                    Architect
                    {p.architectName ? `: ${p.architectName}` : ""}
                  </StatusChip>
                  <StatusChip
                    status={p.hasSignPermit ? "confirmed" : "pending"}
                  >
                    Signage
                    {p.hasSignPermit
                      ? " — sign permit filed"
                      : " — no SG permit yet"}
                  </StatusChip>
                </section>

                <button
                  type="button"
                  disabled={inPipeline || pending}
                  onClick={() => {
                    startTransition(async () => {
                      try {
                        await addProjectToPipeline(project.id);
                        setAdded(true);
                      } catch {
                        // stay on overlay; user can retry / open full page
                      }
                    });
                  }}
                  className="pc-gradient-bg mt-5 flex h-12 w-full items-center justify-center rounded-full text-sm font-bold text-white disabled:opacity-50"
                >
                  {inPipeline
                    ? "Already in pipeline"
                    : pending
                      ? "Adding…"
                      : "Add to Pipeline"}
                </button>

                {detail.sourcing.length > 0 && (
                  <section className="mt-6">
                    <h3 className="text-sm font-bold text-ink">
                      Likely sourcing
                    </h3>
                    <ul className="mt-2 space-y-2">
                      {detail.sourcing.slice(0, 4).map((s) => (
                        <li
                          key={s.trade}
                          className="rounded-xl border border-line bg-offwhite/80 px-3 py-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-bold text-ink">
                              {s.trade}
                            </p>
                            <span className="text-[11px] font-bold text-purple">
                              {s.score}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate">{s.reason}</p>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <section className="mt-6">
                  <h3 className="text-sm font-bold text-ink">
                    Procurement Leads
                  </h3>
                  {detail.leads.length ? (
                    <ul className="mt-2 space-y-2">
                      {detail.leads.map((lead) => {
                        const display = lead.name || lead.firm;
                        return (
                          <li
                            key={lead.role}
                            className="rounded-xl border border-line px-3 py-2.5"
                          >
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate">
                              {lead.role}
                            </p>
                            <p className="mt-0.5 text-sm font-bold text-ink">
                              {display}
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-purple">
                              {lead.phone && (
                                <a
                                  href={`tel:${lead.phone.replace(/\s+/g, "")}`}
                                  className="hover:underline"
                                >
                                  {lead.phone}
                                </a>
                              )}
                              {lead.email && (
                                <a
                                  href={`mailto:${lead.email}`}
                                  className="hover:underline"
                                >
                                  {lead.email}
                                </a>
                              )}
                              {!lead.phone && !lead.email && (
                                <a
                                  href={searchLink(lead.findQuery)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:underline"
                                >
                                  Find contact
                                </a>
                              )}
                              {lead.extraLinks?.map((l) => (
                                <a
                                  key={l.href}
                                  href={l.href}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:underline"
                                >
                                  {l.label}
                                </a>
                              ))}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-slate">
                      No named owner, GC, architect, engineer, or filer yet.
                    </p>
                  )}
                </section>

                {p.scoreReasons?.length > 0 && (
                  <section className="mt-6 mb-4">
                    <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate">
                      Why {p.score}?
                    </h3>
                    <ul className="mt-2 space-y-1">
                      {p.scoreReasons.slice(0, 5).map((r) => (
                        <li key={r} className="text-xs leading-relaxed text-ink">
                          · {r}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </div>
        </>
      )}
    </BottomSheet>
  );
}
