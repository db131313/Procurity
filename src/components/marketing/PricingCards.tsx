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
  variant?: "default" | "marketing" | "bw";
};

export function PricingCards({
  ctaHref = "/signup",
  variant = "default",
}: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [annual, setAnnual] = useState(false);
  const tiers = ["starter", "growth", "pro"] as const;
  const isMarketing = variant === "marketing";
  const isBw = variant === "bw";

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
          ...(annual ? { interval: "year" } : {}),
        }),
      });
      if (res.status === 401) {
        const url = new URL(ctaHref, window.location.origin);
        url.searchParams.set("tier", tier);
        url.searchParams.set("checkout", "1");
        if (annual) url.searchParams.set("interval", "year");
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
    <div data-testid="pricing-cards" data-billing={annual ? "annual" : "monthly"}>
      {(isBw || !isMarketing) && (
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex items-center justify-center gap-3">
            <span
              className={cn(
                "text-sm font-semibold",
                isBw
                  ? annual
                    ? "text-neutral-500"
                    : "text-white"
                  : annual
                    ? "text-slate"
                    : "text-ink",
              )}
            >
              Monthly
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={annual}
              aria-label="Toggle annual billing"
              data-testid="billing-toggle"
              onClick={() => setAnnual((v) => !v)}
              className={cn(
                "relative h-8 w-14 rounded-full transition",
                annual
                  ? isBw
                    ? "bg-white"
                    : "bg-[#2563EB]"
                  : isBw
                    ? "bg-neutral-700"
                    : "bg-line",
              )}
            >
              <span
                className={cn(
                  "absolute top-1 h-6 w-6 rounded-full shadow transition",
                  annual
                    ? isBw
                      ? "left-7 bg-black"
                      : "left-7 bg-white"
                    : isBw
                      ? "left-1 bg-white"
                      : "left-1 bg-white",
                )}
              />
            </button>
            <span
              className={cn(
                "text-sm font-semibold",
                isBw
                  ? annual
                    ? "text-white"
                    : "text-neutral-500"
                  : annual
                    ? "text-ink"
                    : "text-slate",
              )}
            >
              Annual
            </span>
          </div>
          {annual && (
            <p
              className={cn(
                "text-xs",
                isBw ? "text-neutral-400" : "text-slate",
              )}
            >
              Billed yearly — save vs monthly
            </p>
          )}
        </div>
      )}

      <div
        className={cn(
          "grid gap-4 md:grid-cols-3",
          isMarketing &&
            "gap-0 overflow-hidden rounded-xl border border-[#E7DFD0] md:gap-0",
          isBw && "gap-3",
        )}
      >
        {tiers.map((tier, idx) => {
          const plan = PLAN_PRICING[tier];
          const price = annual ? plan.annual : plan.monthly;
          const featured = tier === "growth";
          const zipLabel = formatPlanZipAccess(tier);
          return (
            <article
              key={tier}
              className={cn(
                isBw
                  ? cn(
                      "rounded-2xl border border-white/15 bg-white/[0.03] p-6 text-white",
                      featured && "border-white/40 bg-white/[0.06]",
                    )
                  : isMarketing
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
                    isBw
                      ? "text-neutral-400"
                      : isMarketing
                        ? "text-[#5B6475]"
                        : featured
                          ? "font-bold uppercase tracking-wider text-white/80"
                          : "font-bold uppercase tracking-wider text-slate",
                  )}
                >
                  {plan.name}
                </p>
                {(isMarketing || isBw) && featured && (
                  <span
                    className={cn(
                      "text-[11px] font-medium",
                      isBw ? "text-neutral-300" : "text-[#2563EB]",
                    )}
                  >
                    Recommended
                  </span>
                )}
              </div>
              <p className="mt-2 flex items-baseline gap-1">
                <span
                  className={cn(
                    "text-4xl tabular-nums",
                    isBw
                      ? "font-semibold text-white"
                      : isMarketing
                        ? "font-semibold text-[#14213D]"
                        : "font-bold",
                  )}
                >
                  ${price}
                </span>
                <span
                  className={
                    isBw
                      ? "text-neutral-400"
                      : isMarketing
                        ? "text-[#5B6475]"
                        : featured
                          ? "text-white/75"
                          : "text-slate"
                  }
                >
                  /mo
                </span>
              </p>
              {annual && (
                <p
                  className={cn(
                    "mt-1 text-xs",
                    isBw ? "text-neutral-500" : "text-slate",
                  )}
                  data-testid={`annual-billed-${tier}`}
                >
                  ${plan.annualBilled.toLocaleString("en-US")} billed yearly
                </p>
              )}
              <p
                className={cn(
                  "mt-1 text-sm",
                  isBw
                    ? "text-neutral-400"
                    : isMarketing
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
                        isBw
                          ? "text-white"
                          : isMarketing
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
                  "mt-6 flex h-12 w-full items-center justify-center gap-2 text-sm transition disabled:opacity-60",
                  isBw
                    ? featured
                      ? "bw-btn-primary rounded-full"
                      : "bw-btn-ghost rounded-full"
                    : isMarketing
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
