"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { geoAlbersUsa, geoPath, type GeoProjection } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import { PICKER_CITIES } from "@/lib/cities/picker";
import { ThinkingBlob } from "@/components/ui/ThinkingBlob";
import { cn } from "@/lib/cn";

export type SwarmPin = {
  id: string;
  city: string;
  latitude: number;
  longitude: number;
  score: number;
  projectType?: string;
};

type ByCity = Record<string, { totalCount: number; pinCount: number }>;

type Props = {
  onExplore: (opts?: { cityId?: string; projectId?: string }) => void;
  /** Fires when load progress changes (0→1). Parent hides headline until 1. */
  onProgress?: (progress: number) => void;
  className?: string;
};

const SERVED = PICKER_CITIES.filter((c) => c.served);

type SwarmDot = {
  id: string;
  city: string;
  score: number;
  x: number;
  y: number;
  projectType?: string;
};

type Ping = { x: number; y: number; t0: number; hue: number };

type NationFC = FeatureCollection<Geometry>;

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function formatCount(n: number) {
  return n.toLocaleString("en-US");
}

async function loadNation(): Promise<NationFC> {
  const mod = await import("us-atlas/states-10m.json");
  const topo = (mod.default ?? mod) as {
    objects: { nation: Parameters<typeof feature>[1] };
  };
  return feature(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    topo as any,
    topo.objects.nation,
  ) as unknown as NationFC;
}

/**
 * National D3 canvas swarm: US outline as a dot matrix + real teaser pins.
 * Pins + us-atlas load in parallel; ThinkingBlob grows with real progress.
 * Page scroll is never blocked (touch-action: pan-y; no wheel preventDefault).
 */
export function HomeSwarmMap({ onExplore, onProgress, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [pins, setPins] = useState<SwarmPin[] | null>(null);
  const [byCity, setByCity] = useState<ByCity>({});
  const [nation, setNation] = useState<NationFC | null>(null);
  const [progress, setProgress] = useState(0);
  const [blobGone, setBlobGone] = useState(false);
  const [fade, setFade] = useState(0);
  const [uiOn, setUiOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [scoreMin, setScoreMin] = useState(0);
  const [scoreMax, setScoreMax] = useState(100);
  const [dragEdge, setDragEdge] = useState<"min" | "max" | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);
  const [displayCount, setDisplayCount] = useState(0);
  const dotsRef = useRef<SwarmDot[]>([]);
  const matrixRef = useRef<{ x: number; y: number }[]>([]);
  const pingsRef = useRef<Ping[]>([]);
  const projectRef = useRef<GeoProjection | null>(null);
  const sizeRef = useRef({ w: 1, h: 1, dpr: 1 });
  const labelsRef = useRef<
    { id: string; label: string; count: number; x: number; y: number }[]
  >([]);
  const rafRef = useRef(0);
  const reducedRef = useRef(true);
  const [layoutTick, setLayoutTick] = useState(0);
  const firstFrameRef = useRef(false);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  const bumpProgress = useCallback((v: number) => {
    setProgress((p) => {
      const next = Math.max(p, v);
      if (next !== p) onProgressRef.current?.(next);
      return next;
    });
  }, []);

  const filteredPins = useMemo(() => {
    if (!pins) return [];
    return pins.filter((p) => p.score >= scoreMin && p.score <= scoreMax);
  }, [pins, scoreMin, scoreMax]);

  const hist = useMemo(() => {
    const bins = new Array(20).fill(0) as number[];
    if (!pins) return bins;
    for (const p of pins) {
      const i = Math.min(19, Math.floor(p.score / 5));
      bins[i]! += 1;
    }
    return bins;
  }, [pins]);

  const totalVisible = filteredPins.length;
  const showBlob = !blobGone && !error;

  // Parallel: pins fetch + us-atlas geometry
  useEffect(() => {
    let cancelled = false;
    firstFrameRef.current = false;
    setError(null);
    setBlobGone(false);
    setFade(0);
    setUiOn(false);
    setProgress(0.1);
    onProgressRef.current?.(0.1);
    setPins(null);
    setNation(null);

    (async () => {
      bumpProgress(0.1);
      try {
        const pinsPromise = (async () => {
          const res = await fetch("/api/teaser/pins/all", { cache: "default" });
          if (cancelled) return null;
          bumpProgress(0.3);
          if (!res.ok) throw new Error(`Pins failed (${res.status})`);
          const data = (await res.json()) as {
            ok?: boolean;
            pins?: SwarmPin[];
            byCity?: ByCity;
          };
          bumpProgress(0.6);
          // Fix: !data.ok must throw (not silent return) so Retry works and blob clears
          if (!data.ok || !Array.isArray(data.pins)) {
            throw new Error("Pins response invalid");
          }
          return data;
        })();

        const [pinData, nationData] = await Promise.all([
          pinsPromise,
          loadNation(),
        ]);
        if (cancelled) return;
        if (!pinData) return;
        setPins(pinData.pins || []);
        setByCity(pinData.byCity || {});
        setNation(nationData);
        bumpProgress(0.8);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Could not load the map");
        setProgress(0);
        onProgressRef.current?.(0);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bumpProgress, retryKey]);

  // When progress hits 1: fade UI + dots in, blob out
  useEffect(() => {
    if (progress < 1 || error) return;
    if (prefersReducedMotion()) {
      setFade(1);
      setUiOn(true);
      setDisplayCount(pins?.length ?? 0);
      setBlobGone(true);
      return;
    }
    setUiOn(true);
    const t0 = performance.now();
    const dur = 700;
    const target = pins?.length ?? 0;
    let id = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setFade(eased);
      setDisplayCount(Math.round(target * eased));
      if (t < 1) id = requestAnimationFrame(tick);
      else setTimeout(() => setBlobGone(true), 280);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [progress, error, pins]);

  const measure = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return false;
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    if (w < 40 || h < 40) return false;
    const prev = sizeRef.current;
    sizeRef.current = { w, h, dpr };
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    if (prev.w !== w || prev.h !== h) setLayoutTick((t) => t + 1);
    return true;
  }, []);

  useEffect(() => {
    measure();
    const wrap = wrapRef.current;
    const ro =
      typeof ResizeObserver !== "undefined" && wrap
        ? new ResizeObserver(() => measure())
        : null;
    if (wrap) ro?.observe(wrap);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  useEffect(() => {
    let cancelled = false;
    reducedRef.current = prefersReducedMotion();
    if (!nation) return;

    (async () => {
      if (!measure()) return;
      if (cancelled) return;
      const { w, h } = sizeRef.current;
      if (w < 40 || h < 40) return;
      const padX = w * 0.04;
      const padY = h * 0.06;
      const projection = geoAlbersUsa().fitExtent(
        [
          [padX, padY],
          [w - padX, h - padY * 1.2],
        ],
        nation,
      );
      projectRef.current = projection;
      const path = geoPath(projection);

      const matrix: { x: number; y: number }[] = [];
      const step = Math.max(4, Math.floor(Math.min(w, h) / 100));
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const octx = off.getContext("2d");
      if (octx) {
        octx.beginPath();
        path.context(octx)(nation);
        octx.fillStyle = "#fff";
        octx.fill();
        const img = octx.getImageData(0, 0, w, h).data;
        for (let y = step; y < h; y += step) {
          for (let x = step; x < w; x += step) {
            const i = (y * w + x) * 4;
            if (img[i]! > 10) matrix.push({ x, y });
          }
        }
      }
      matrixRef.current = matrix;

      const dots: SwarmDot[] = [];
      for (const p of filteredPins) {
        const xy = projection([p.longitude, p.latitude]);
        if (!xy) continue;
        dots.push({
          id: p.id,
          city: p.city,
          score: p.score,
          x: xy[0],
          y: xy[1],
          projectType: p.projectType,
        });
      }
      dotsRef.current = dots;

      labelsRef.current = SERVED.map((c) => {
        const xy = projection(c.center);
        if (!xy) return null;
        const count = byCity[c.id]?.totalCount ?? byCity[c.id]?.pinCount ?? 0;
        return {
          id: c.id,
          label:
            c.id === "miami_dade"
              ? "Miami-Dade"
              : c.label.replace(" City", ""),
          count,
          x: xy[0],
          y: xy[1] - 14,
        };
      }).filter(Boolean) as {
        id: string;
        label: string;
        count: number;
        x: number;
        y: number;
      }[];

      const top = [...dots].sort((a, b) => b.score - a.score).slice(0, 4);
      const now = performance.now();
      pingsRef.current = top.map((d, i) => ({
        x: d.x,
        y: d.y,
        t0: now - i * 900,
        hue: i % 4,
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, [filteredPins, byCity, measure, layoutTick, nation]);

  // Draw loop — first painted frame bumps progress to 1
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = (now: number) => {
      const { w, h, dpr } = sizeRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      if (
        !firstFrameRef.current &&
        matrixRef.current.length &&
        nation &&
        pins
      ) {
        firstFrameRef.current = true;
        bumpProgress(1);
      }

      const alpha = Math.max(0, fade);

      ctx.globalAlpha = 0.45 * alpha;
      ctx.fillStyle = "#a3a3a3";
      for (const p of matrixRef.current) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.15, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const d of dotsRef.current) {
        const t = Math.max(0, Math.min(1, (d.score - 20) / 80));
        const r = 1.4 + t * 2.2;
        const bright = 0.55 + t * 0.45;
        ctx.globalAlpha = bright * alpha;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reducedRef.current) {
        const hues = ["#5EE7FF", "#A78BFA", "#FF7AC6", "#FFC46B"];
        for (const ping of pingsRef.current) {
          const age = ((now - ping.t0) % 3200) / 3200;
          const r = 8 + age * 42;
          ctx.globalAlpha = (1 - age) * 0.45 * alpha;
          ctx.strokeStyle = hues[ping.hue]!;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(ping.x, ping.y, r, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 0.95 * alpha;
      ctx.fillStyle = "#e5e5e5";
      ctx.font =
        "500 12px ui-sans-serif, system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      for (const lab of labelsRef.current) {
        ctx.fillText(`${lab.label} ${formatCount(lab.count)}`, lab.x, lab.y);
      }

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [fade, bumpProgress, nation, pins]);

  const hitTest = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    for (const lab of labelsRef.current) {
      if (Math.hypot(lab.x - x, lab.y - y) < 28) {
        return { kind: "city" as const, id: lab.id, label: lab.label, x, y };
      }
    }
    let best: SwarmDot | null = null;
    let bestD = 14;
    for (const d of dotsRef.current) {
      const dist = Math.hypot(d.x - x, d.y - y);
      if (dist < bestD) {
        bestD = dist;
        best = d;
      }
    }
    if (best) {
      return {
        kind: "pin" as const,
        id: best.id,
        city: best.city,
        score: best.score,
        label: best.projectType || "Project",
        x,
        y,
      };
    }
    return null;
  }, []);

  const onPointerMove = (e: ReactPointerEvent) => {
    const hit = hitTest(e.clientX, e.clientY);
    if (!hit) {
      setTooltip(null);
      return;
    }
    if (hit.kind === "city") {
      setTooltip({ x: hit.x, y: hit.y, text: hit.label });
    } else {
      setTooltip({
        x: hit.x,
        y: hit.y,
        text: `${hit.label} · Buy score ${Math.round(hit.score)}`,
      });
    }
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    const hit = hitTest(e.clientX, e.clientY);
    if (!hit) return;
    if (hit.kind === "city") onExplore({ cityId: hit.id });
    else onExplore({ cityId: hit.city, projectId: hit.id });
  };

  const histRef = useRef<HTMLDivElement | null>(null);
  const updateFromClientX = useCallback(
    (clientX: number, edge: "min" | "max") => {
      const el = histRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const t = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const score = Math.round(t * 100);
      if (edge === "min") setScoreMin(Math.min(score, scoreMax - 5));
      else setScoreMax(Math.max(score, scoreMin + 5));
    },
    [scoreMax, scoreMin],
  );

  useEffect(() => {
    if (!dragEdge) return;
    const move = (e: PointerEvent) => updateFromClientX(e.clientX, dragEdge);
    const up = () => setDragEdge(null);
    // Passive listeners — never block page scroll
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragEdge, updateFromClientX]);

  const maxBin = Math.max(1, ...hist);

  return (
    <div
      ref={wrapRef}
      className={cn("relative h-full w-full select-none", className)}
      data-testid="home-swarm"
      style={{ touchAction: "pan-y" }}
    >
      {showBlob && (
        <div
          className={cn(
            "absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-500",
            progress >= 1 ? "pointer-events-none opacity-0" : "opacity-100",
          )}
          data-testid="swarm-blob"
        >
          <ThinkingBlob
            size="fullscreen"
            label="Loading projects"
            progress={progress}
          />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="max-w-sm text-sm text-neutral-300">{error}</p>
          <button
            type="button"
            className="bw-btn-primary pc-press h-11 px-6 text-sm"
            data-testid="swarm-retry"
            onClick={() => setRetryKey((k) => k + 1)}
          >
            Retry
          </button>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ opacity: fade, touchAction: "pan-y" }}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setTooltip(null)}
        onPointerUp={onPointerUp}
        role="img"
        aria-label="National map of commercial projects"
        data-testid="swarm-canvas"
      />

      <ul className="sr-only">
        {labelsRef.current.map((l) => (
          <li key={l.id}>
            {l.label}: {l.count} projects
          </li>
        ))}
      </ul>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full rounded-md border border-white/15 bg-black/90 px-2.5 py-1 text-xs text-white shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y - 10 }}
        >
          {tooltip.text}
        </div>
      )}

      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-4 px-5 pb-5 transition-opacity duration-500 md:px-10 md:pb-8",
          uiOn ? "opacity-100" : "opacity-0",
        )}
        data-testid="swarm-chrome"
        aria-hidden={!uiOn}
      >
        <div>
          <p
            className="text-4xl font-semibold tabular-nums tracking-tight text-white md:text-5xl"
            data-testid="swarm-count"
          >
            {formatCount(displayCount || totalVisible)}
          </p>
          <p className="mt-1 text-xs text-neutral-400 md:text-sm">
            projects on the map right now
          </p>
        </div>

        <div
          className="pointer-events-auto w-[min(100%,280px)] shrink-0"
          data-testid="buy-score-hist"
          style={{ touchAction: "none" }}
        >
          <div className="mb-1 flex items-center justify-between text-[11px] text-neutral-300">
            <span>Buy score</span>
            <span>
              {scoreMin <= 0 && scoreMax >= 100
                ? "All scores"
                : `${scoreMin}–${scoreMax}`}
            </span>
          </div>
          <div
            ref={histRef}
            className="relative h-12 cursor-ew-resize"
            style={{ touchAction: "none" }}
            onPointerDown={(e) => {
              const el = histRef.current;
              if (!el) return;
              const rect = el.getBoundingClientRect();
              const t = (e.clientX - rect.left) / rect.width;
              const score = t * 100;
              const distMin = Math.abs(score - scoreMin);
              const distMax = Math.abs(score - scoreMax);
              const edge = distMin <= distMax ? "min" : "max";
              setDragEdge(edge);
              updateFromClientX(e.clientX, edge);
            }}
          >
            <div className="absolute inset-x-0 bottom-4 flex h-8 items-end gap-px">
              {hist.map((v, i) => {
                const lo = i * 5;
                const hi = lo + 5;
                const active = hi > scoreMin && lo < scoreMax;
                return (
                  <div
                    key={i}
                    className={cn(
                      "min-w-0 flex-1 rounded-sm",
                      active ? "bg-neutral-300" : "bg-neutral-700",
                    )}
                    style={{ height: `${Math.max(8, (v / maxBin) * 100)}%` }}
                  />
                );
              })}
            </div>
            <div
              className="absolute bottom-3 top-0 w-0.5 bg-white"
              style={{ left: `${scoreMin}%` }}
            />
            <div
              className="absolute bottom-3 top-0 w-0.5 bg-white"
              style={{ left: `${scoreMax}%` }}
            />
            <div className="absolute inset-x-0 bottom-0 flex justify-between text-[10px] text-neutral-500">
              <span>30</span>
              <span>50</span>
              <span>70</span>
              <span>90</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
