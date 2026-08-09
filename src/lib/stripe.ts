import Stripe from "stripe";

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, {
    apiVersion: "2026-07-29.dahlia",
  });
}

export function stripeConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PRICE_ID &&
      (process.env.STRIPE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
  );
}

export const PRO_PRICE_DISPLAY = {
  name: "Procurity Pro",
  amount: 149,
  interval: "month" as const,
  features: [
    "Daily Top 20 visit list with probability scores",
    "Owner, applicant & permittee contact intel",
    "3D Mapbox field routing map",
    "Borough filters & procurement window labels",
    "Live NYC DOB NOW refresh",
  ],
};
