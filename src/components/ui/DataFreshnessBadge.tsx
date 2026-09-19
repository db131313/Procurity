"use client";

import { RefreshCw } from "lucide-react";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";

type Props = {
  iso: string | null | undefined;
  label?: string;
  className?: string;
  /** denser terminal-style treatment */
  variant?: "pill" | "panel";
};

/** Prominent “data freshness” chip for home + project detail. */
export function DataFreshnessBadge({
  iso,
  label = "Data refreshed",
  className,
  variant = "pill",
}: Props) {
  if (!iso) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 border border-dashed border-line bg-offwhite/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate",
          variant === "panel" ? "rounded-lg" : "rounded-full",
          className,
        )}
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        Sync pending
      </div>
    );
  }

  const absolute = (() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  })();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 border border-teal/30 bg-teal/10 px-3 py-1.5 text-[11px] font-bold tracking-wide text-ink",
        variant === "panel" ? "rounded-lg" : "rounded-full",
        className,
      )}
      title={absolute}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-40" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-teal" />
      </span>
      <RefreshCw className="h-3.5 w-3.5 text-teal" aria-hidden />
      <span className="uppercase text-slate">{label}</span>
      <span className="font-mono tabular-nums text-ink">
        {relativeTime(iso)}
      </span>
    </div>
  );
}
