"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export function WhyScore({
  score,
  reasons,
}: {
  score: number;
  reasons: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="mt-8">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl border border-line bg-white px-4 py-3 text-left"
      >
        <span className="text-sm font-bold text-ink">Why {score}?</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-slate transition",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <ul className="mt-3 space-y-2 rounded-2xl border border-line bg-offwhite p-4">
          {reasons.map((r) => (
            <li key={r} className="text-sm leading-relaxed text-ink">
              · {r}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
