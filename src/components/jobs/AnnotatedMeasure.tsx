"use client";

import { useRef, useState } from "react";
import type { MeasurementAnnotation } from "@/lib/jobs/types";

type Point = { x: number; y: number };

/**
 * Tap two points on a photo, enter the real-world length between them.
 */
export function AnnotatedMeasure({
  scanId,
  imageUrl,
  unit,
  onSave,
}: {
  scanId: string;
  imageUrl: string;
  unit: "in" | "ft";
  onSave: (payload: {
    label: string;
    annotation: MeasurementAnnotation;
  }) => Promise<void>;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [label, setLabel] = useState("Annotated length");
  const [realLength, setRealLength] = useState("");
  const [pending, setPending] = useState(false);

  function onClick(e: React.MouseEvent<HTMLImageElement>) {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setPoints((prev) => {
      const next = [...prev, { x, y }];
      return next.slice(-2);
    });
  }

  async function save() {
    if (points.length < 2) return;
    const len = Number(realLength);
    if (!Number.isFinite(len) || len <= 0) return;
    setPending(true);
    try {
      await onSave({
        label,
        annotation: {
          scanId,
          x1: points[0]!.x,
          y1: points[0]!.y,
          x2: points[1]!.x,
          y2: points[1]!.y,
          realLength: len,
        },
      });
      setPoints([]);
      setRealLength("");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-white p-3">
      <p className="text-sm font-bold text-ink">Annotate photo</p>
      <p className="text-xs text-slate">
        Tap two points on the image, then enter the real length ({unit}).
      </p>
      <div className="relative overflow-hidden rounded-xl bg-ink">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Annotate"
          className="max-h-72 w-full cursor-crosshair object-contain"
          onClick={onClick}
        />
        {points.map((p, i) => (
          <span
            key={i}
            className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-purple"
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
          />
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="rounded-xl border border-line px-3 py-2 text-sm"
          placeholder="Label"
        />
        <input
          value={realLength}
          onChange={(e) => setRealLength(e.target.value)}
          className="rounded-xl border border-line px-3 py-2 text-sm"
          placeholder={`Length (${unit})`}
          inputMode="decimal"
        />
        <button
          type="button"
          disabled={pending || points.length < 2}
          onClick={() => void save()}
          className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save measurement"}
        </button>
      </div>
    </div>
  );
}
