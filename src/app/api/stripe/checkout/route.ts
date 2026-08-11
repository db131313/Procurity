import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getStripe,
  priceIdForTier,
  stripeConfigured,
  type CheckoutTier,
} from "@/lib/stripe";
import { updateUserPlan, upsertUser } from "@/lib/db/store";

const TIERS: CheckoutTier[] = ["starter", "growth", "pro"];

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let tier: CheckoutTier = "growth";
  try {
    const body = (await request.json()) as { tier?: string };
    if (body.tier && TIERS.includes(body.tier as CheckoutTier)) {
      tier = body.tier as CheckoutTier;
    }
  } catch {
    // default growth
  }

  if (!stripeConfigured()) {
    await updateUserPlan(user.id, tier);
    return NextResponse.json({
      demo: true,
      url: `/app/billing?upgraded=${tier}`,
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

  let customerId = user.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await upsertUser({
      firebaseUid: user.firebaseUid,
      email: user.email,
      stripeCustomerId: customerId,
    });
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/app/billing?checkout=success&tier=${tier}`,
    cancel_url: `${origin}/pricing?checkout=cancel`,
    metadata: {
      userId: user.id,
      email: user.email,
      tier,
    },
  });

  return NextResponse.json({ url: checkout.url });
}
