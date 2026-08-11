"use client";

import { useState } from "react";
import { PLAN_PRICING } from "@/lib/db/types";

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
          onClick={() => checkout(tier)}
          className="rounded-2xl border border-line bg-white px-4 py-3 text-left transition hover:shadow-md disabled:opacity-60"
        >
          <p className="text-sm font-bold text-ink">{PLAN_PRICING[tier].name}</p>
          <p className="mt-1 text-xs text-slate">
            ${PLAN_PRICING[tier].monthly}/mo ·{" "}
            {loading === tier ? "Redirecting…" : "Checkout"}
          </p>
        </button>
      ))}
      {error && <p className="text-sm text-hot sm:col-span-3">{error}</p>}
    </div>
  );
}
