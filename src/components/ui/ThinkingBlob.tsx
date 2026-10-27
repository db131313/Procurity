"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type Size = "inline" | "panel" | "fullscreen";

const SIZE: Record<
  Size,
  { wrap: string; blob: string; label?: string }
> = {
  inline: {
    wrap: "relative inline-flex h-5 w-5 items-center justify-center overflow-hidden rounded-full",
    blob: "h-5 w-5",
  },
  panel: {
    wrap: "relative flex h-28 w-28 items-center justify-center",
    blob: "h-28 w-28",
    label: "Loading",
  },
  fullscreen: {
    wrap: "relative flex h-48 w-48 items-center justify-center md:h-64 md:w-64",
    blob: "h-48 w-48 md:h-64 md:w-64",
    label: "Loading projects",
  },
};

/**
 * Aurora thinking indicator — four soft color circles that drift slowly.
 * Optional `progress` (0–1) grows the blob from ~0.35 → 1.2 (never jumps/shrinks).
 */
export function ThinkingBlob({
  size = "panel",
  className,
  label,
  progress,
}: {
  size?: Size;
  className?: string;
  /** Optional visible/SR label; defaults by size */
  label?: string;
  /** Real load progress 0–1; smoothed so it never shrinks */
  progress?: number;
}) {
  const s = SIZE[size];
  const text = label ?? s.label;
  const [smooth, setSmooth] = useState(0);

  useEffect(() => {
    if (progress == null) return;
    const target = Math.max(0, Math.min(1, progress));
    let raf = 0;
    const tick = () => {
      setSmooth((prev) => {
        if (target <= prev) return prev; // never shrink
        const next = prev + (target - prev) * 0.12;
        if (target - next < 0.002) return target;
        raf = requestAnimationFrame(tick);
        return next;
      });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progress]);

  const scale =
    progress == null ? 1 : 0.35 + Math.max(0, Math.min(1, smooth)) * 0.85; // .35 → 1.2

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(s.wrap, className)}
      data-testid="thinking-blob"
      data-size={size}
      data-progress={progress == null ? undefined : smooth.toFixed(2)}
      style={
        progress == null
          ? undefined
          : { transform: `scale(${scale})`, transition: "transform 80ms linear" }
      }
    >
      <div className={cn("pc-think", s.blob)} aria-hidden>
        <span className="pc-think-orb pc-think-orb-a" />
        <span className="pc-think-orb pc-think-orb-b" />
        <span className="pc-think-orb pc-think-orb-c" />
        <span className="pc-think-orb pc-think-orb-d" />
        <span className="pc-think-static" />
      </div>
      {text ? <span className="sr-only">{text}</span> : null}
    </div>
  );
}
