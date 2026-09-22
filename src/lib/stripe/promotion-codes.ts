/**
 * Stripe native coupons + promotion codes for Procurity access discounts.
 * Coupons are looked up / created by metadata (pc_discount_level) — no env IDs required.
 */

import type Stripe from "stripe";

export const DISCOUNT_LEVELS = [25, 50, 75, 100] as const;
export type DiscountLevel = (typeof DISCOUNT_LEVELS)[number];

const META_KEY = "pc_discount_level";
const META_SOURCE = "pc_source";

export function isDiscountLevel(n: number): n is DiscountLevel {
  return (DISCOUNT_LEVELS as readonly number[]).includes(n);
}

function couponName(level: DiscountLevel) {
  return level === 100
    ? "Procurity 100% off (full access)"
    : `Procurity ${level}% off`;
}

/**
 * Ensure the 4 standard percent-off coupons exist (all plans / flexible).
 * - 25/50/75: duration once (first invoice)
 * - 100: duration forever (demo / free access via real checkout)
 */
export async function ensureDiscountCoupons(
  stripe: Stripe,
): Promise<Record<DiscountLevel, Stripe.Coupon>> {
  const listed = await stripe.coupons.list({ limit: 100 });
  const byLevel = new Map<number, Stripe.Coupon>();
  for (const c of listed.data) {
    if (c.deleted) continue;
    const level = Number(c.metadata?.[META_KEY]);
    if (isDiscountLevel(level) && !byLevel.has(level)) {
      byLevel.set(level, c);
    }
  }

  const out = {} as Record<DiscountLevel, Stripe.Coupon>;
  for (const level of DISCOUNT_LEVELS) {
    let coupon = byLevel.get(level);
    if (!coupon) {
      coupon = await stripe.coupons.create({
        percent_off: level,
        duration: level === 100 ? "forever" : "once",
        name: couponName(level),
        metadata: {
          [META_KEY]: String(level),
          [META_SOURCE]: "procurity_ensure",
        },
      });
    }
    out[level] = coupon;
  }
  return out;
}

/** Stable, high-redemption test codes (sk_test only) for conversion QA. */
export async function ensureTestModePromoCodes(
  stripe: Stripe,
  coupons: Record<DiscountLevel, Stripe.Coupon>,
): Promise<Record<DiscountLevel, string>> {
  const codes: Record<DiscountLevel, string> = {
    25: "PC25",
    50: "PC50",
    75: "PC75",
    100: "PC100",
  };
  const out = {} as Record<DiscountLevel, string>;

  for (const level of DISCOUNT_LEVELS) {
    const code = codes[level];
    const existing = await stripe.promotionCodes.list({
      code,
      limit: 1,
      active: true,
    });
    if (existing.data[0]) {
      out[level] = existing.data[0].code;
      continue;
    }
    try {
      const created = await stripe.promotionCodes.create({
        promotion: { type: "coupon", coupon: coupons[level].id },
        code,
        active: true,
        metadata: {
          [META_KEY]: String(level),
          [META_SOURCE]: "procurity_test_seed",
        },
      });
      out[level] = created.code;
    } catch (err) {
      const again = await stripe.promotionCodes.list({ code, limit: 1 });
      if (again.data[0]) {
        out[level] = again.data[0].code;
      } else {
        throw err;
      }
    }
  }
  return out;
}

export async function createProspectPromotionCode(
  stripe: Stripe,
  level: DiscountLevel,
  opts?: { code?: string; maxRedemptions?: number },
): Promise<Stripe.PromotionCode> {
  const coupons = await ensureDiscountCoupons(stripe);
  const coupon = coupons[level];
  const raw = (opts?.code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");
  const code =
    raw ||
    `PC${level}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  return stripe.promotionCodes.create({
    promotion: { type: "coupon", coupon: coupon.id },
    code,
    active: true,
    max_redemptions: opts?.maxRedemptions ?? 1,
    metadata: {
      [META_KEY]: String(level),
      [META_SOURCE]: "procurity_admin",
    },
  });
}

export function isStripeTestMode(secretKey: string | undefined): boolean {
  return Boolean(secretKey?.startsWith("sk_test"));
}
