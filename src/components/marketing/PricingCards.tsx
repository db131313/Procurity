"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { PLAN_PRICING } from "@/lib/db/types";
import { cn } from "@/lib/cn";

const FEATURES = {
  starter: [
    "Live map + Buy Score",
    "Daily permit data refresh",
    "Pipeline tracking",
    "Email alerts",
    "Up to 3 zip codes",
  ],
  growth: [
    "Everything in Starter",
    "Priority hot opportunity alerts",
    "Deal analytics dashboard",
    "CSV export",
    "Up to 10 zip codes",
  ],
  pro: [
    "Everything in Growth",
    "Team pipeline sharing (5 seats)",
    "API access (coming soon)",
    "Dedicated account support",
    "Up to 25 zip codes",
  ],
} as const;

export function PricingCards({ ctaHref = "/signup" }: { ctaHref?: string }) {
  const [annual, setAnnual] = useState(false);
  const tiers = ["starter", "growth", "pro"] as const;

  return (
    <div>
      <div className="mb-8 flex items-center justify-center gap-3">
        <span className={cn("text-sm font-semibold", !annual ? "text-ink" : "text-slate")}>
          Monthly
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={annual}
          onClick={() => setAnnual((v) => !v)}
          className={cn(
            "relative h-8 w-14 rounded-full transition",
            annual ? "pc-gradient-bg" : "bg-line",
          )}
        >
          <span
            className={cn(
              "absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition",
              annual && "translate-x-6",
            )}
          />
        </button>
        <span className={cn("text-sm font-semibold", annual ? "text-ink" : "text-slate")}>
          Annual <span className="text-purple">~20% off</span>
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {tiers.map((tier) => {
          const plan = PLAN_PRICING[tier];
          const price = annual ? plan.annual : plan.monthly;
          const featured = tier === "growth";
          return (
            <article
              key={tier}
              className={cn(
                "rounded-[22px] border p-6 transition hover:-translate-y-0.5 hover:shadow-lg",
                featured
                  ? "border-transparent pc-gradient-bg text-white shadow-lg"
                  : "border-line bg-white text-ink",
              )}
            >
              <p className={cn("text-sm font-bold uppercase tracking-wider", featured ? "text-white/80" : "text-slate")}>
                {plan.name}
              </p>
              <p className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold tabular-nums">${price}</span>
                <span className={featured ? "text-white/75" : "text-slate"}>/mo</span>
              </p>
              <p className={cn("mt-1 text-sm", featured ? "text-white/80" : "text-slate")}>
                Up to {plan.zips} zip codes
              </p>
              <ul className="mt-5 space-y-2.5">
                {FEATURES[tier].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className={cn("mt-0.5 h-4 w-4 shrink-0", featured ? "text-teal" : "text-purple")} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={ctaHref}
                className={cn(
                  "mt-6 flex h-12 items-center justify-center rounded-full text-sm font-bold transition active:scale-[0.98]",
                  featured
                    ? "bg-white text-ink"
                    : "pc-gradient-bg text-white",
                )}
              >
                Start free trial
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}
