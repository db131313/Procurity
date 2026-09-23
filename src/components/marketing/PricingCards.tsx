"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { formatPlanZipAccess, PLAN_PRICING } from "@/lib/db/types";
import { cn } from "@/lib/cn";
import {
  normalizePromoCodeInput,
  PROMO_CODE_STORAGE_KEY,
} from "@/lib/stripe/promotion-codes";
import { WorkingSpinner } from "@/components/ui/WorkingIndicator";

const FEATURES = {
  starter: [
    "Live map + Buy Score",
    "Daily permit data refresh",
    "Pipeline tracking",
    "Email alerts",
    "1 zip code",
  ],
  growth: [
    "Everything in Starter",
    "Priority hot opportunity alerts",
    "Deal analytics dashboard",
    "CSV export",
    "5 zip codes",
  ],
  pro: [
    "Everything in Growth",
    "Team pipeline sharing (5 seats)",
    "API access (coming soon)",
    "Dedicated account support",
    "Full US access",
  ],
} as const;

export function PricingCards({ ctaHref = "/signup" }: { ctaHref?: string }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tiers = ["starter", "growth", "pro"] as const;

  function readPromoCode(): string {
    try {
      const fromQuery =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("code") || ""
          : "";
      const fromStore =
        typeof window !== "undefined"
          ? sessionStorage.getItem(PROMO_CODE_STORAGE_KEY) || ""
          : "";
      return (
        normalizePromoCodeInput(fromQuery) ||
        normalizePromoCodeInput(fromStore)
      );
    } catch {
      return "";
    }
  }

  async function startTrial(tier: (typeof tiers)[number]) {
    setLoading(tier);
    setError(null);
    try {
      const promotionCode = readPromoCode();
      if (promotionCode) {
        try {
          sessionStorage.setItem(PROMO_CODE_STORAGE_KEY, promotionCode);
        } catch {
          // ignore
        }
      }
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          ...(promotionCode ? { promotionCode } : {}),
        }),
      });
      if (res.status === 401) {
        const q = new URLSearchParams({ tier, checkout: "1" });
        if (promotionCode) q.set("code", promotionCode);
        window.location.href = `${ctaHref}?${q.toString()}`;
        return;
      }
      const data = (await res.json()) as {
        url?: string;
        error?: string;
        demo?: boolean;
      };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Checkout unavailable");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoading(null);
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex items-center justify-center gap-3">
          <span className="text-sm font-semibold text-ink">Monthly</span>
          <button
            type="button"
            role="switch"
            aria-checked={false}
            aria-disabled="true"
            disabled
            title="Annual billing coming soon — checkout is monthly for now"
            className="relative h-8 w-14 cursor-not-allowed rounded-full bg-line opacity-60"
          >
            <span className="absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow" />
          </button>
          <span className="text-sm font-semibold text-slate">
            Annual <span className="text-slate/80">· soon</span>
          </span>
        </div>
        <p className="text-xs text-slate">
          Checkout is monthly today. Annual plans are on the way.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {tiers.map((tier) => {
          const plan = PLAN_PRICING[tier];
          const price = plan.monthly;
          const featured = tier === "growth";
          const zipLabel = formatPlanZipAccess(tier);
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
                {tier === "pro" ? "Full US access" : zipLabel}
              </p>
              <ul className="mt-5 space-y-2.5">
                {FEATURES[tier].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className={cn("mt-0.5 h-4 w-4 shrink-0", featured ? "text-teal" : "text-purple")} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={loading !== null}
                onClick={() => startTrial(tier)}
                className={cn(
                  "mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-bold transition active:scale-[0.98] disabled:opacity-60",
                  featured
                    ? "bg-white text-ink"
                    : "pc-gradient-bg text-white",
                )}
                aria-busy={loading === tier || undefined}
              >
                {loading === tier ? <WorkingSpinner /> : null}
                {loading === tier ? "Starting…" : "Start free trial"}
              </button>
            </article>
          );
        })}
      </div>
      {error && (
        <p className="mt-4 text-center text-sm text-hot">{error}</p>
      )}
    </div>
  );
}
