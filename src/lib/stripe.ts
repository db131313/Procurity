import Stripe from "stripe";
import type { PlanTier } from "@/lib/db/types";

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, {
    apiVersion: "2026-07-29.dahlia",
  });
}

export type CheckoutTier = "starter" | "growth" | "pro";

export function priceIdForTier(tier: CheckoutTier): string | undefined {
  const map: Record<CheckoutTier, string | undefined> = {
    starter: process.env.STRIPE_PRICE_STARTER || process.env.STRIPE_PRICE_ID,
    growth: process.env.STRIPE_PRICE_GROWTH,
    pro: process.env.STRIPE_PRICE_PRO,
  };
  return map[tier];
}

export function stripeConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      (process.env.STRIPE_PRICE_STARTER ||
        process.env.STRIPE_PRICE_GROWTH ||
        process.env.STRIPE_PRICE_PRO ||
        process.env.STRIPE_PRICE_ID) &&
      (process.env.STRIPE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
  );
}

export function planFromTier(tier: CheckoutTier): PlanTier {
  return tier;
}
