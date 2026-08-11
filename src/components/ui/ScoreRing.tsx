"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type ScoreRingProps = {
  score: number;
  size?: number;
  stroke?: number;
  className?: string;
  label?: string;
};

export function ScoreRing({
  score,
  size = 72,
  stroke = 6,
  className,
  label,
}: ScoreRingProps) {
  const [value, setValue] = useState(0);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setValue(score);
      return;
    }
    setValue(0);
    const start = performance.now();
    const duration = 800;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(score * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const hot = score >= 90;

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        hot && "pc-hot-glow",
        className,
      )}
      style={{ width: size, height: size }}
      aria-label={label ?? `Buy score ${score}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--pc-line)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#scoreGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7C6CF6" />
            <stop offset="100%" stopColor="#38D9C9" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute font-bold tabular-nums text-ink" style={{ fontSize: size * 0.28 }}>
        {value}
      </span>
    </div>
  );
}
