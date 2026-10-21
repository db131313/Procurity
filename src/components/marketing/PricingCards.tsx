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
    "Daily data refresh",
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

type Props = {
  ctaHref?: string;
  /** Clean table layout for sunrise marketing pages */
  variant?: "default" | "marketing";
};

export function PricingCards({
  ctaHref = "/signup",
  variant = "default",
}: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tiers = ["starter", "growth", "pro"] as const;
  const isMarketing = variant === "marketing";

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
        const url = new URL(ctaHref, window.location.origin);
        url.searchParams.set("tier", tier);
        url.searchParams.set("checkout", "1");
        if (promotionCode) url.searchParams.set("code", promotionCode);
        window.location.href = `${url.pathname}${url.search}`;
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
      {!isMarketing && (
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
      )}

      <div
        className={cn(
          "grid gap-4 md:grid-cols-3",
          isMarketing && "gap-0 overflow-hidden rounded-xl border border-[#E7DFD0] md:gap-0",
        )}
      >
        {tiers.map((tier, idx) => {
          const plan = PLAN_PRICING[tier];
          const price = plan.monthly;
          const featured = tier === "growth";
          const zipLabel = formatPlanZipAccess(tier);
          return (
            <article
              key={tier}
              className={cn(
                isMarketing
                  ? cn(
                      "border-[#E7DFD0] bg-[#FBF7F0] p-6 text-[#14213D]",
                      idx > 0 && "border-t md:border-t-0 md:border-l",
                      featured && "bg-[#F8F1E6]",
                    )
                  : cn(
                      "rounded-[22px] border p-6 transition",
                      featured
                        ? "border-[#2563EB] bg-[#2563EB] text-white shadow-sm"
                        : "border-line bg-white text-ink",
                    ),
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isMarketing
                      ? "text-[#5B6475]"
                      : featured
                        ? "font-bold uppercase tracking-wider text-white/80"
                        : "font-bold uppercase tracking-wider text-slate",
                  )}
                >
                  {plan.name}
                </p>
                {isMarketing && featured && (
                  <span className="text-[11px] font-medium text-[#2563EB]">
                    Recommended
                  </span>
                )}
              </div>
              <p className="mt-2 flex items-baseline gap-1">
                <span
                  className={cn(
                    "text-4xl tabular-nums",
                    isMarketing ? "font-semibold text-[#14213D]" : "font-bold",
                  )}
                >
                  ${price}
                </span>
                <span
                  className={
                    isMarketing
                      ? "text-[#5B6475]"
                      : featured
                        ? "text-white/75"
                        : "text-slate"
                  }
                >
                  /mo
                </span>
              </p>
              <p
                className={cn(
                  "mt-1 text-sm",
                  isMarketing
                    ? "text-[#5B6475]"
                    : featured
                      ? "text-white/80"
                      : "text-slate",
                )}
              >
                {tier === "pro" ? "Full US access" : zipLabel}
              </p>
              <ul className="mt-5 space-y-2.5">
                {FEATURES[tier].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        isMarketing
                          ? "text-[#2563EB]"
                          : featured
                            ? "text-white"
                            : "text-[#2563EB]",
                      )}
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={loading !== null}
                onClick={() => startTrial(tier)}
                className={cn(
                  "mt-6 flex h-12 w-full items-center justify-center gap-2 text-sm transition active:scale-[0.98] disabled:opacity-60",
                  isMarketing
                    ? featured
                      ? "rounded-lg bg-[#2563EB] font-medium text-[#FBF7F0] hover:bg-[#1d4ed8]"
                      : "rounded-lg border border-[#E7DFD0] bg-transparent font-medium text-[#14213D] hover:bg-[#F8F1E6]"
                    : cn(
                        "rounded-full font-bold",
                        featured
                          ? "bg-white text-ink"
                          : "bg-[#2563EB] text-white",
                      ),
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
