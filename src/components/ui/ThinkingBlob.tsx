"use client";

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
 * Gradient is for motion/loading only (never large surfaces).
 */
export function ThinkingBlob({
  size = "panel",
  className,
  label,
}: {
  size?: Size;
  className?: string;
  /** Optional visible/SR label; defaults by size */
  label?: string;
}) {
  const s = SIZE[size];
  const text = label ?? s.label;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(s.wrap, className)}
      data-testid="thinking-blob"
      data-size={size}
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
