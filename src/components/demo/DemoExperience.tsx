"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import Link from "next/link";
import {
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  LngLatBounds,
} from "maplibre-gl";
import { PICKER_CITIES, type PickerCity } from "@/lib/cities/picker";
import { DEMO_STEPS } from "@/lib/demo/types";
import type { DemoProject } from "@/lib/demo/types";
import { cn } from "@/lib/cn";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
  "https://tiles.openfreemap.org/styles/liberty";

const SERVED = PICKER_CITIES.filter((c) => c.served);

function scoreColor(score: number): string {
  if (score >= 80) return "#2563EB";
  if (score >= 65) return "#64748b";
  return "#94a3b8";
}

function track(
  type: string,
  city: string,
  step?: string,
) {
  void fetch("/api/demo/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, city, step }),
  }).catch(() => {});
}

type Props = {
  initialCityId: string;
  liveMode: boolean;
  presentMode: boolean;
  canUseLive: boolean;
};

export function DemoExperience({
  initialCityId,
  liveMode,
  presentMode,
  canUseLive,
}: Props) {
  const [cityId, setCityId] = useState(initialCityId);
  const [step, setStep] = useState(0);
  const [projects, setProjects] = useState<DemoProject[]>([]);
  const [realCount, setRealCount] = useState(0);
  const [sampleCount, setSampleCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DemoProject | null>(null);
  const [tourSkipped, setTourSkipped] = useState(false);
  const [finished, setFinished] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [zip, setZip] = useState("");
  const [revealContacts, setRevealContacts] = useState(false);
  const [measurePts, setMeasurePts] = useState<{ x: number; y: number }[]>([]);
  const [depositPct, setDepositPct] = useState<50 | 100>(50);
  const [showPayMock, setShowPayMock] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const [leadOk, setLeadOk] = useState(false);
  const [leadBusy, setLeadBusy] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const city: PickerCity =
    SERVED.find((c) => c.id === cityId) ?? SERVED[0]!;
  const stepMeta = DEMO_STEPS[step]!;
  const present = presentMode;

  const filtered = useMemo(
    () => projects.filter((p) => p.score >= minScore),
    [projects, minScore],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelected(null);
    try {
      if (liveMode && canUseLive) {
        const q = new URLSearchParams({
          city: cityId,
          ...(zip ? { zip } : {}),
          ...(revealContacts ? { reveal: "1" } : {}),
        });
        const res = await fetch(`/api/demo/live?${q}`, { cache: "no-store" });
        if (res.status === 401) {
          setError("Live mode needs an admin or demo-user login.");
          setProjects([]);
          return;
        }
        const data = await res.json();
        setProjects(data.projects || []);
        setRealCount((data.projects || []).length);
        setSampleCount(0);
      } else {
        const res = await fetch(
          `/api/demo/projects?city=${encodeURIComponent(cityId)}`,
          { cache: "no-store" },
        );
        const data = await res.json();
        if (!data.ok) throw new Error("load failed");
        setProjects(data.projects || []);
        setRealCount(data.realCount || 0);
        setSampleCount(data.sampleCount || 0);
      }
    } catch {
      setError("Couldn’t load demo projects. Try again.");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [cityId, liveMode, canUseLive, zip, revealContacts]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    track("demo_started", cityId);
  }, [cityId]);

  useEffect(() => {
    if (!present) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        goNext();
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setStep((s) => Math.max(0, s - 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [present, step, finished]);

  function goNext() {
    if (finished) return;
    track("step_completed", cityId, stepMeta.id);
    if (step >= DEMO_STEPS.length - 1) {
      setFinished(true);
      track("demo_finished", cityId);
      return;
    }
    setStep((s) => s + 1);
  }

  function resetDemo() {
    setStep(0);
    setSelected(null);
    setTourSkipped(false);
    setFinished(false);
    setMeasurePts([]);
    setShowPayMock(false);
    setShowPdf(false);
    setDepositPct(50);
    setLeadOk(false);
    setLeadError(null);
    setMinScore(0);
    void load();
  }

  async function submitLead(form: FormData) {
    setLeadBusy(true);
    setLeadError(null);
    try {
      const res = await fetch("/api/demo/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
          shopName: form.get("shopName"),
          city: form.get("city") || cityId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not submit");
      }
      setLeadOk(true);
      track("cta_clicked", cityId, "lead_submitted");
    } catch (e) {
      setLeadError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setLeadBusy(false);
    }
  }

  const measuredInches =
    measurePts.length === 2
      ? Math.round(
          Math.hypot(
            measurePts[1]!.x - measurePts[0]!.x,
            measurePts[1]!.y - measurePts[0]!.y,
          ) *
            (3.375 / 80),
        )
      : null;

  const quoteLines = [
    {
      desc: `Channel letters · ${measuredInches ?? 48}" wide`,
      qty: 1,
      unit: 1850,
    },
    { desc: "Raceway + LED modules", qty: 1, unit: 620 },
    { desc: "Install labor (crew of 2)", qty: 4, unit: 95 },
  ];
  const subtotal = quoteLines.reduce((s, l) => s + l.qty * l.unit * 1.4, 0);
  const tax = subtotal * 0.08875;
  const total = subtotal + tax;
  const deposit = total * (depositPct / 100);

  return (
    <div
      className={cn(
        "min-h-[100dvh] bg-white text-ink",
        present && "text-lg",
      )}
    >
      {/* Demo mode banner */}
      <div className="sticky top-0 z-40 border-b border-[#2563EB]/25 bg-[#2563EB] px-4 py-2 text-center text-sm font-bold text-white">
        Demo mode
        {liveMode ? " · Live (sales)" : " · Public examples"}
        {present ? " · Presenter" : ""}
        <button
          type="button"
          onClick={resetDemo}
          className="ml-3 inline-flex h-8 items-center rounded-full bg-white/20 px-3 text-xs font-bold hover:bg-white/30"
        >
          Reset demo
        </button>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#2563EB]">
              Interactive demo
            </p>
            <h1
              className={cn(
                "mt-1 font-bold tracking-tight",
                present ? "text-4xl" : "text-2xl md:text-3xl",
              )}
            >
              See Procurity in five steps
            </h1>
            <p className="mt-1 text-sm text-slate">
              {liveMode
                ? "Fresh projects for your zip — contacts masked unless you reveal."
                : "Real examples past the buying window, plus sample fillers. No personal contacts."}
            </p>
          </div>
          {!present && (
            <Link
              href={`/signup?city=${encodeURIComponent(cityId)}`}
              className="inline-flex h-11 items-center rounded-full border border-line px-4 text-sm font-bold"
              onClick={() => track("cta_clicked", cityId, "signup_nag")}
            >
              Start free trial
            </Link>
          )}
        </div>

        {/* City picker */}
        <div className="mt-6 flex flex-wrap gap-2">
          {SERVED.map((c) => (
            <Link
              key={c.id}
              href={`/demo?city=${c.id}${liveMode ? "&live=1" : ""}${present ? "&present=1" : ""}`}
              onClick={() => setCityId(c.id)}
              className={cn(
                "inline-flex h-11 items-center rounded-full border px-3.5 text-sm font-bold",
                c.id === cityId
                  ? "border-[#2563EB] bg-[#2563EB] text-white"
                  : "border-line bg-white text-ink",
              )}
            >
              {c.shortLabel}
            </Link>
          ))}
        </div>

        {liveMode && canUseLive && (
          <div className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-offwhite p-4">
            <label className="text-sm font-semibold">
              Zip for live projects
              <input
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className="mt-1 block h-11 w-32 rounded-xl border border-line px-3"
                placeholder="10001"
                inputMode="numeric"
              />
            </label>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex h-11 items-center rounded-full bg-[#2563EB] px-4 text-sm font-bold text-white"
            >
              Load zip
            </button>
            <label className="flex h-11 items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={revealContacts}
                onChange={(e) => setRevealContacts(e.target.checked)}
                className="h-5 w-5"
              />
              Reveal contacts (presenter only)
            </label>
          </div>
        )}

        {/* Progress */}
        {!finished && (
          <div className="mt-8">
            <div className="flex items-center justify-between gap-2">
              <p className={cn("font-bold", present ? "text-xl" : "text-sm")}>
                Step {step + 1} of {DEMO_STEPS.length}: {stepMeta.title}
              </p>
              {!tourSkipped && (
                <button
                  type="button"
                  className="text-sm font-semibold text-slate underline-offset-2 hover:underline"
                  onClick={() => setTourSkipped(true)}
                >
                  Skip tour
                </button>
              )}
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-line"
              role="progressbar"
              aria-valuenow={step + 1}
              aria-valuemin={1}
              aria-valuemax={DEMO_STEPS.length}
            >
              <div
                className="h-full bg-[#2563EB] transition-all"
                style={{
                  width: `${((step + 1) / DEMO_STEPS.length) * 100}%`,
                }}
              />
            </div>
            {!tourSkipped && (
              <p className={cn("mt-3 text-slate", present ? "text-lg" : "text-sm")}>
                {stepMeta.blurb}{" "}
                <span className="font-semibold text-ink">{stepMeta.prompt}</span>
              </p>
            )}
          </div>
        )}

        {loading && (
          <p className="mt-8 text-sm font-semibold text-slate">Loading projects…</p>
        )}
        {error && (
          <div className="mt-6 rounded-2xl border border-line bg-offwhite p-4">
            <p className="text-sm text-ink">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-2 inline-flex h-11 items-center rounded-full bg-[#2563EB] px-4 text-sm font-bold text-white"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && !finished && (
          <div className="mt-6">
            {step === 0 && (
              <DemoMap
                city={city}
                projects={filtered}
                present={present}
                minScore={minScore}
                onMinScore={setMinScore}
                selectedId={selected?.id}
                onSelect={(p) => {
                  setSelected(p);
                }}
              />
            )}

            {step === 1 && (
              <ProjectCardStep
                project={selected || filtered[0] || null}
                present={present}
                onStartJob={() => goNext()}
              />
            )}

            {step === 2 && (
              <MeasureStep
                present={present}
                points={measurePts}
                onPoints={setMeasurePts}
                inches={measuredInches}
              />
            )}

            {step === 3 && (
              <QuoteStep
                present={present}
                lines={quoteLines}
                subtotal={subtotal}
                tax={tax}
                total={total}
                showPdf={showPdf}
                onPreview={() => setShowPdf(true)}
              />
            )}

            {step === 4 && (
              <PaidStep
                present={present}
                total={total}
                depositPct={depositPct}
                deposit={deposit}
                showPayMock={showPayMock}
                onDeposit={setDepositPct}
                onPay={() => setShowPayMock(true)}
              />
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={goNext}
                className={cn(
                  "inline-flex items-center justify-center rounded-full bg-[#2563EB] px-6 font-bold text-white",
                  present ? "h-14 text-lg" : "h-12 text-sm",
                )}
              >
                {step >= DEMO_STEPS.length - 1 ? "Finish" : "Next"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep(0);
                  setTourSkipped(false);
                  setFinished(false);
                }}
                className="inline-flex h-12 items-center text-sm font-semibold text-slate underline-offset-2 hover:underline"
              >
                Restart
              </button>
              <p className="text-xs text-slate">
                {realCount} real · {sampleCount} sample
                {liveMode ? " · live mode" : ""}
              </p>
            </div>
          </div>
        )}

        {finished && (
          <EndScreen
            cityId={cityId}
            present={present}
            leadOk={leadOk}
            leadBusy={leadBusy}
            leadError={leadError}
            onLead={submitLead}
            onRestart={resetDemo}
          />
        )}
      </div>
    </div>
  );
}

function DemoMap({
  city,
  projects,
  present,
  minScore,
  onMinScore,
  selectedId,
  onSelect,
}: {
  city: PickerCity;
  projects: DemoProject[];
  present: boolean;
  minScore: number;
  onMinScore: (n: number) => void;
  selectedId?: string;
  onSelect: (p: DemoProject) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;
    let map: MapLibreMap | null = null;
    const init = () => {
      if (cancelled || !containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      if (width < 2 || height < 2) {
        requestAnimationFrame(init);
        return;
      }
      map = new MapLibreMap({
        container: containerRef.current,
        style: STYLE_URL,
        center: city.center,
        zoom: city.zoom,
      });
      map.addControl(new NavigationControl({ visualizePitch: false }), "top-right");
      mapRef.current = map;
      map.on("load", () => {
        if (cancelled || !map) return;
        map.addSource("demo", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "demo-pins",
          type: "circle",
          source: "demo",
          paint: {
            "circle-radius": present ? 10 : 8,
            "circle-color": ["get", "color"],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#fff",
          },
        });
        map.on("click", "demo-pins", (e) => {
          const id = e.features?.[0]?.properties?.projectId as string | undefined;
          if (!id) return;
          const p = projects.find((x) => x.id === id);
          if (p) onSelect(p);
        });
        map.on("mouseenter", "demo-pins", () => {
          map!.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "demo-pins", () => {
          map!.getCanvas().style.cursor = "";
        });
        setReady(true);
      });
    };
    const raf = requestAnimationFrame(init);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      map?.remove();
      mapRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city.id, present]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource("demo") as GeoJSONSource | undefined;
    if (!source) return;
    source.setData({
      type: "FeatureCollection",
      features: projects.map((p, i) => ({
        type: "Feature",
        id: i + 1,
        properties: {
          projectId: p.id,
          color: scoreColor(p.score),
          selected: p.id === selectedId,
        },
        geometry: {
          type: "Point",
          coordinates: [p.longitude, p.latitude],
        },
      })),
    });
    if (projects.length) {
      const b = new LngLatBounds();
      for (const p of projects) b.extend([p.longitude, p.latitude]);
      map.fitBounds(b, { padding: 48, maxZoom: 13, duration: 600 });
    }
  }, [projects, ready, selectedId]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold text-slate">
          Min Buy Score: {minScore}
          <input
            type="range"
            min={0}
            max={90}
            step={5}
            value={minScore}
            onChange={(e) => onMinScore(Number(e.target.value))}
            className="ml-2 align-middle"
          />
        </label>
      </div>
      <div className="overflow-hidden rounded-2xl border border-line bg-[#dfe7ef]">
        <div
          ref={containerRef}
          className={cn("w-full", present ? "h-[520px]" : "h-[380px] md:h-[460px]")}
          role="application"
          aria-label={`Demo map for ${city.label}`}
        />
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {projects.slice(0, 8).map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onSelect(p)}
              className={cn(
                "flex w-full flex-col rounded-xl border px-3 py-3 text-left transition",
                selectedId === p.id
                  ? "border-[#2563EB] bg-[#2563EB]/5"
                  : "border-line bg-white hover:border-[#2563EB]/40",
              )}
            >
              <span className="text-sm font-bold">{p.address}</span>
              <span className="text-xs text-slate">
                Score {p.score} · {p.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProjectCardStep({
  project,
  present,
  onStartJob,
}: {
  project: DemoProject | null;
  present: boolean;
  onStartJob: () => void;
}) {
  if (!project) {
    return (
      <p className="text-sm text-slate">
        Pick a project on the map first, or tap Next to continue with a sample.
      </p>
    );
  }
  return (
    <article
      className={cn(
        "rounded-2xl border border-line bg-white p-5 shadow-sm",
        present && "p-8",
      )}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-[#2563EB]">
        {project.label}
      </p>
      <h2 className={cn("mt-2 font-bold", present ? "text-3xl" : "text-xl")}>
        {project.address}
      </h2>
      <p className="mt-1 text-sm text-slate">
        {project.projectType} · {project.phaseLabel}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2563EB] text-xl font-bold text-white">
          {project.score}
        </div>
        <div>
          <p className="text-sm font-bold">Buy Score</p>
          <p className="text-sm text-slate">
            Est. ${project.valueLow.toLocaleString()}–$
            {project.valueHigh.toLocaleString()}
          </p>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {project.scoreReasons.map((r) => (
          <li key={r} className="text-sm text-slate">
            · {r}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm font-semibold text-ink">
        {project.contactMasked}
      </p>
      <button
        type="button"
        onClick={onStartJob}
        className={cn(
          "mt-6 inline-flex items-center justify-center rounded-full bg-[#2563EB] px-6 font-bold text-white",
          present ? "h-14 text-lg" : "h-12 text-sm",
        )}
      >
        Start job
      </button>
    </article>
  );
}

function MeasureStep({
  present,
  points,
  onPoints,
  inches,
}: {
  present: boolean;
  points: { x: number; y: number }[];
  onPoints: (p: { x: number; y: number }[]) => void;
  inches: number | null;
}) {
  function onClick(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (points.length >= 2) onPoints([pt]);
    else onPoints([...points, pt]);
  }
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-line bg-offwhite px-3 py-1 text-xs font-bold text-slate">
          Reference: credit card (3.375&quot;)
        </span>
        <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
          LiDAR scan on iPhone · Coming soon
        </span>
      </div>
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter") onPoints([]);
        }}
        className={cn(
          "relative cursor-crosshair overflow-hidden rounded-2xl border border-line",
          present ? "h-[420px]" : "h-[300px]",
        )}
        style={{
          background:
            "linear-gradient(160deg,#cbd5e1 0%,#e2e8f0 40%,#94a3b8 100%)",
        }}
        aria-label="Sample site photo — tap two points to measure"
      >
        <div className="absolute left-[18%] top-[28%] h-[42%] w-[48%] rounded-sm border-2 border-white/80 bg-ink/20" />
        <div className="absolute bottom-4 left-4 rounded bg-white/90 px-2 py-1 text-[10px] font-bold">
          Sample site photo
        </div>
        {points.map((p, i) => (
          <span
            key={i}
            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#2563EB]"
            style={{ left: p.x, top: p.y }}
          />
        ))}
        {points.length === 2 && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            <line
              x1={points[0]!.x}
              y1={points[0]!.y}
              x2={points[1]!.x}
              y2={points[1]!.y}
              stroke="#2563EB"
              strokeWidth="3"
            />
          </svg>
        )}
      </div>
      <p className="mt-3 text-sm font-semibold text-ink">
        {inches != null
          ? `Measured width ≈ ${inches}" (demo scale)`
          : "Tap two points on the sign face."}
      </p>
    </div>
  );
}

function QuoteStep({
  present,
  lines,
  subtotal,
  tax,
  total,
  showPdf,
  onPreview,
}: {
  present: boolean;
  lines: { desc: string; qty: number; unit: number }[];
  subtotal: number;
  tax: number;
  total: number;
  showPdf: boolean;
  onPreview: () => void;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <h2 className={cn("font-bold", present ? "text-2xl" : "text-lg")}>
        Sample quote
      </h2>
      <p className="mt-1 text-sm text-slate">
        Line items from the measurement · 40% markup · tax included
      </p>
      <ul className="mt-4 divide-y divide-line">
        {lines.map((l) => (
          <li
            key={l.desc}
            className="flex items-center justify-between gap-3 py-3 text-sm"
          >
            <span>
              {l.desc}
              <span className="block text-xs text-slate">
                Qty {l.qty} · ${l.unit}/ea · +markup
              </span>
            </span>
            <span className="font-bold tabular-nums">
              ${(l.qty * l.unit * 1.4).toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-slate">Subtotal</span>
          <span className="font-semibold">${subtotal.toFixed(0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate">Tax</span>
          <span className="font-semibold">${tax.toFixed(0)}</span>
        </div>
        <div className="flex justify-between text-base font-bold">
          <span>Total</span>
          <span>${total.toFixed(0)}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onPreview}
        className="mt-5 inline-flex h-12 items-center rounded-full bg-[#2563EB] px-5 text-sm font-bold text-white"
      >
        Preview quote PDF
      </button>
      {showPdf && (
        <div className="mt-4 rounded-xl border border-line bg-offwhite p-4 text-sm">
          <p className="font-bold text-[#2563EB]">Procurity Signs</p>
          <p className="mt-2 font-semibold">Quote preview (demo)</p>
          <p className="mt-1 text-slate">
            Branded sample PDF — not saved, no email sent.
          </p>
          <p className="mt-3 text-lg font-bold">${total.toFixed(0)}</p>
        </div>
      )}
    </div>
  );
}

function PaidStep({
  present,
  total,
  depositPct,
  deposit,
  showPayMock,
  onDeposit,
  onPay,
}: {
  present: boolean;
  total: number;
  depositPct: 50 | 100;
  deposit: number;
  showPayMock: boolean;
  onDeposit: (n: 50 | 100) => void;
  onPay: () => void;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="flex items-center gap-2">
        <h2 className={cn("font-bold", present ? "text-2xl" : "text-lg")}>
          Sample invoice
        </h2>
        <span className="rounded-full bg-[#2563EB]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#2563EB]">
          Demo
        </span>
      </div>
      <p className="mt-1 text-sm text-slate">
        No real payment — this is a walkthrough only.
      </p>
      <p className="mt-4 text-sm font-semibold">
        Invoice total: ${total.toFixed(0)}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {([50, 100] as const).map((pct) => (
          <button
            key={pct}
            type="button"
            onClick={() => onDeposit(pct)}
            className={cn(
              "inline-flex h-11 items-center rounded-full border px-4 text-sm font-bold",
              depositPct === pct
                ? "border-[#2563EB] bg-[#2563EB] text-white"
                : "border-line bg-white",
            )}
          >
            {pct}% deposit (${(total * (pct / 100)).toFixed(0)})
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onPay}
        className="mt-5 inline-flex h-12 items-center rounded-full bg-[#2563EB] px-5 text-sm font-bold text-white"
      >
        Pay now
      </button>
      {showPayMock && (
        <div className="mt-4 rounded-xl border border-dashed border-[#2563EB] bg-[#2563EB]/5 p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-[#2563EB]">
            Demo payment screen
          </p>
          <p className="mt-2 text-2xl font-bold">${deposit.toFixed(0)}</p>
          <p className="mt-1 text-sm text-slate">
            Card form stub — nothing is charged.
          </p>
        </div>
      )}
    </div>
  );
}

function EndScreen({
  cityId,
  present,
  leadOk,
  leadBusy,
  leadError,
  onLead,
  onRestart,
}: {
  cityId: string;
  present: boolean;
  leadOk: boolean;
  leadBusy: boolean;
  leadError: string | null;
  onLead: (fd: FormData) => Promise<void>;
  onRestart: () => void;
}) {
  return (
    <div className="mt-8 max-w-lg">
      <h2 className={cn("font-bold tracking-tight", present ? "text-3xl" : "text-2xl")}>
        You&apos;ve seen the flow
      </h2>
      <p className="mt-2 text-slate">
        Start a free trial for your city, or book a 15-minute walkthrough with
        us.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/signup?city=${encodeURIComponent(cityId)}`}
          className="inline-flex h-12 items-center rounded-full bg-[#2563EB] px-5 text-sm font-bold text-white"
          onClick={() => track("cta_clicked", cityId, "start_trial")}
        >
          Start free trial
        </Link>
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex h-12 items-center rounded-full border border-line px-5 text-sm font-bold"
        >
          Restart demo
        </button>
      </div>

      <form
        className="mt-10 space-y-3 rounded-2xl border border-line bg-offwhite p-5"
        onSubmit={(e) => {
          e.preventDefault();
          void onLead(new FormData(e.currentTarget));
        }}
      >
        <h3 className="font-bold">Book a 15-minute walkthrough</h3>
        <input
          name="name"
          required
          placeholder="Your name"
          className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm"
        />
        <input
          name="phone"
          type="tel"
          placeholder="Phone"
          className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm"
        />
        <input
          name="shopName"
          placeholder="Shop name"
          className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm"
        />
        <input type="hidden" name="city" value={cityId} />
        <button
          type="submit"
          disabled={leadBusy || leadOk}
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#2563EB] text-sm font-bold text-white disabled:opacity-60"
        >
          {leadOk ? "Request sent" : leadBusy ? "Sending…" : "Book walkthrough"}
        </button>
        {leadError && <p className="text-sm text-hot">{leadError}</p>}
        {leadOk && (
          <p className="text-sm font-semibold text-ink">
            Thanks — we&apos;ll be in touch soon.
          </p>
        )}
      </form>
    </div>
  );
}
