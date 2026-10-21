"use client";

import Link from "next/link";
import { PICKER_CITIES } from "@/lib/cities/picker";
import { cn } from "@/lib/cn";

/** City quick-pick for the marketing home — no auth required. */
export function CityQuickPick({
  className,
  variant = "light",
}: {
  className?: string;
  variant?: "light" | "dark";
}) {
  const dark = variant === "dark";
  return (
    <div className={cn("w-full", className)}>
      <p
        className={cn(
          "text-sm font-bold",
          dark ? "text-white" : "text-ink",
        )}
      >
        Pick your city to see projects near you
      </p>
      <p
        className={cn(
          "mt-1 text-sm",
          dark ? "text-white/75" : "text-slate",
        )}
      >
        Peek at projects on the map — sign up when you&apos;re ready for full
        scores and contacts.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {PICKER_CITIES.map((city) => (
          <Link
            key={city.id}
            href={`/teaser/${city.id}`}
            className={cn(
              "inline-flex h-11 items-center justify-center rounded-full border px-3.5 text-sm font-bold transition active:scale-[0.98]",
              dark
                ? city.served
                  ? "border-white/25 bg-white/10 text-white hover:bg-white/20"
                  : "border-white/15 bg-transparent text-white/55 hover:bg-white/10"
                : city.served
                  ? "border-line bg-white text-ink shadow-sm hover:border-[#2563EB]/40"
                  : "border-dashed border-line bg-offwhite text-slate hover:border-ink/20",
            )}
          >
            {city.shortLabel}
            <span
              className={cn(
                "ml-1.5 text-[10px] font-semibold uppercase",
                dark ? "text-white/45" : "text-slate",
              )}
            >
              {city.state}
            </span>
            {!city.served && (
              <span className="ml-1 text-[10px] font-semibold text-amber-700">
                soon
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
