"use client";

import { Sparkles } from "lucide-react";

type Props = {
  message: string;
  onDismiss?: () => void;
};

/** Compact agent framing over the reused map route view. */
export function PlanMyDayAgentBanner({ message, onDismiss }: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-14 z-40 flex justify-center px-3 md:top-16">
      <div className="pointer-events-auto flex max-w-md items-start gap-2 rounded-2xl border border-teal/25 bg-ink/95 px-3.5 py-2.5 text-left text-white shadow-lg backdrop-blur">
        <Sparkles
          className="mt-0.5 h-4 w-4 shrink-0 text-teal"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal">
            Agent
          </p>
          <p className="mt-0.5 text-sm font-semibold leading-snug">{message}</p>
        </div>
        {onDismiss ? (
          <button
            type="button"
            aria-label="Dismiss"
            onClick={onDismiss}
            className="shrink-0 rounded-full px-1.5 text-xs font-bold text-white/55 hover:text-white"
          >
            ✕
          </button>
        ) : null}
      </div>
    </div>
  );
}
