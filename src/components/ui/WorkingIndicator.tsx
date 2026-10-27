"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { ThinkingBlob } from "@/components/ui/ThinkingBlob";

type Size = "sm" | "md";

/** Inline aurora loader used inside buttons and status chips. */
export function WorkingSpinner({
  className,
  size = "sm",
}: {
  className?: string;
  size?: Size;
}) {
  return (
    <ThinkingBlob
      size="inline"
      className={cn(
        size === "sm" ? "h-4 w-4" : "h-5 w-5",
        "shrink-0",
        className,
      )}
      label=""
    />
  );
}

type PillProps = {
  children: React.ReactNode;
  className?: string;
  /** Teal agent framing (Plan My Day). */
  agent?: boolean;
  /** Show thinking blob (default true). */
  spin?: boolean;
};

/**
 * Consistent frosted loading chip used on map, overlays, and agent waits.
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
        <ThinkingBlob size="inline" className="shrink-0" label="" />
      ) : null}
      <span>{children}</span>
    </div>
  );
}
