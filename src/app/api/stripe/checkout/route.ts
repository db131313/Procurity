import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getStripe,
  priceIdForTier,
  stripeConfigured,
  type CheckoutTier,
} from "@/lib/stripe";
import {
  ensureDiscountCoupons,
  ensureTestModePromoCodes,
  findActivePromotionCode,
  isStripeTestMode,
  normalizePromoCodeInput,
} from "@/lib/stripe/promotion-codes";
import { upsertUser } from "@/lib/db/store";
import { resolveCheckoutOrigin } from "@/lib/env";
import type Stripe from "stripe";

const TIERS: CheckoutTier[] = ["starter", "growth", "pro"];

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let tier: CheckoutTier = "growth";
  let city: string | undefined;
  let promotionCodeRaw: string | undefined;
  try {
    const body = (await request.json()) as {
      tier?: string;
      city?: string;
      promotionCode?: string;
      promoCode?: string;
      code?: string;
    };
    if (body.tier && TIERS.includes(body.tier as CheckoutTier)) {
      tier = body.tier as CheckoutTier;
    }
    if (body.city && typeof body.city === "string") {
      city = body.city.trim().slice(0, 64) || undefined;
    }
    const raw =
      body.promotionCode || body.promoCode || body.code || "";
    if (typeof raw === "string" && raw.trim()) {
      promotionCodeRaw = raw;
    }
  } catch {
    // default growth
  }

  if (!stripeConfigured()) {
    const { updateUserPlan } = await import("@/lib/db/store");
    await updateUserPlan(user.id, tier);
    // Non-Pro with empty zips → onboarding (layout also gates /app/map).
    const nextPath =
      tier === "pro"
        ? city
          ? `/app/map?city=${encodeURIComponent(city)}`
          : `/app/map`
        : `/app/onboarding`;
    return NextResponse.json({
      demo: true,
      url: nextPath,
    });
  }

  const stripe = getStripe();
  const priceId = priceIdForTier(tier);
  if (!stripe || !priceId) {
    return NextResponse.json(
      { error: `Stripe price not configured for ${tier}` },
      { status: 500 },
    );
  }

  // Ensure standard coupons (+ test-mode QA codes) exist before Checkout.
  try {
    const coupons = await ensureDiscountCoupons(stripe);
    if (isStripeTestMode(process.env.STRIPE_SECRET_KEY)) {
      await ensureTestModePromoCodes(stripe, coupons);
    }
  } catch (err) {
    console.warn("[stripe/checkout] ensure coupons", err);
  }

  // Customer-entered code from public signup/login → pre-apply on Checkout.
  // Stripe forbids combining `discounts` with `allow_promotion_codes`.
  let resolvedPromo: Stripe.PromotionCode | null = null;
  if (promotionCodeRaw) {
    const normalized = normalizePromoCodeInput(promotionCodeRaw);
    if (!normalized) {
      return NextResponse.json(
        { error: "Enter a valid access code, or leave the field blank." },
        { status: 400 },
      );
    }
    try {
      resolvedPromo = await findActivePromotionCode(stripe, normalized);
    } catch (err) {
      console.warn("[stripe/checkout] promo lookup", err);
      return NextResponse.json(
        { error: "Could not verify that access code. Try again." },
        { status: 502 },
      );
    }
    if (!resolvedPromo) {
      return NextResponse.json(
        {
          error:
            "That access code is not valid, expired, or already used up.",
        },
        { status: 400 },
      );
    }
  }

  let customerId = user.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { userId: user.id, firebaseUid: user.firebaseUid },
    });
    customerId = customer.id;
    await upsertUser({
      firebaseUid: user.firebaseUid,
      email: user.email,
      stripeCustomerId: customerId,
    });
  }

  const origin = resolveCheckoutOrigin(request);
  const successCity = city ? `&city=${encodeURIComponent(city)}` : "";
  const cancelCode = resolvedPromo
    ? `&code=${encodeURIComponent(resolvedPromo.code)}`
    : "";

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    // Skip card collection when a 100% code brings the total to $0.
    payment_method_collection: "if_required",
    success_url:
      tier === "pro"
        ? `${origin}/app/map?checkout=success&tier=${tier}${successCity}`
        : `${origin}/app/onboarding?checkout=success&tier=${tier}${successCity}`,
    cancel_url: `${origin}/signup?checkout=cancel${city ? `&city=${encodeURIComponent(city)}` : ""}${cancelCode}`,
    client_reference_id: user.id,
    metadata: {
      userId: user.id,
      email: user.email,
      tier,
      firebaseUid: user.firebaseUid,
      ...(city ? { city } : {}),
      ...(resolvedPromo ? { promotionCode: resolvedPromo.code } : {}),
    },
    subscription_data: {
      metadata: {
        userId: user.id,
        email: user.email,
        tier,
        ...(city ? { city } : {}),
        ...(resolvedPromo ? { promotionCode: resolvedPromo.code } : {}),
      },
    },
  };

  if (resolvedPromo) {
    sessionParams.discounts = [{ promotion_code: resolvedPromo.id }];
  } else {
    // No code from signup — still let them enter one on Stripe Checkout.
    sessionParams.allow_promotion_codes = true;
  }

  const checkout = await stripe.checkout.sessions.create(sessionParams);

  return NextResponse.json({
    url: checkout.url,
    appliedPromotionCode: resolvedPromo?.code ?? null,
  });
}
