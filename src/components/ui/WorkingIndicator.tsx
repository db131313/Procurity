"use client";

import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

type Size = "sm" | "md";

/** Spinning loader used inside buttons and inline status. */
export function WorkingSpinner({
  className,
  size = "sm",
}: {
  className?: string;
  size?: Size;
}) {
  return (
    <Loader2
      className={cn(
        "animate-spin",
        size === "sm" ? "h-4 w-4" : "h-5 w-5",
        className,
      )}
      aria-hidden
    />
  );
}

type PillProps = {
  children: React.ReactNode;
  className?: string;
  /** Teal agent framing (Plan My Day). */
  agent?: boolean;
  /** Show spinning loader (default true). */
  spin?: boolean;
};

/**
 * Consistent frosted loading chip used on map, overlays, and agent waits.
 * Matches existing map chrome: white/95 + border-line + backdrop-blur.
 */
export function WorkingPill({
  children,
  className,
  agent = false,
  spin = true,
}: PillProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold shadow-md backdrop-blur",
        agent
          ? "border-teal/30 bg-teal/10 text-ink"
          : "border-line bg-white/95 text-slate",
        className,
      )}
    >
      {agent ? (
        <Sparkles className="h-4 w-4 shrink-0 animate-pulse text-teal" aria-hidden />
      ) : spin ? (
        <WorkingSpinner className="shrink-0 text-purple" />
      ) : null}
      <span>{children}</span>
    </div>
  );
}
