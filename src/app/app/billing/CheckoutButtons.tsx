"use client";

import { useState } from "react";
import { formatPlanZipAccess, PLAN_PRICING } from "@/lib/db/types";
import { WorkingSpinner } from "@/components/ui/WorkingIndicator";

const TIERS = ["starter", "growth", "pro"] as const;

export function CheckoutButtons() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function checkout(tier: (typeof TIERS)[number]) {
    setLoading(tier);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoading(null);
    }
  }

  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-3">
      {TIERS.map((tier) => (
        <button
          key={tier}
          type="button"
          disabled={loading !== null}
          aria-busy={loading === tier || undefined}
          onClick={() => checkout(tier)}
          className="rounded-2xl border border-line bg-white px-4 py-3 text-left transition hover:shadow-md disabled:opacity-60"
        >
          <p className="text-sm font-bold text-ink">{PLAN_PRICING[tier].name}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate">
            {loading === tier ? <WorkingSpinner className="text-purple" /> : null}
            ${PLAN_PRICING[tier].monthly}/mo · {formatPlanZipAccess(tier)} ·{" "}
            {loading === tier ? "Redirecting…" : "Checkout"}
          </p>
        </button>
      ))}
      {error && <p className="text-sm text-hot sm:col-span-3">{error}</p>}
    </div>
  );
}
