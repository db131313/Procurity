import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { findUserByEmail, updateUserPlan } from "@/lib/users";

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!stripeConfigured()) {
    // Demo upgrade path when Stripe keys are absent
    await updateUserPlan(session.user.email, { plan: "pro" });
    return NextResponse.json({
      demo: true,
      url: "/dashboard?upgraded=1",
    });
  }

  const stripe = getStripe();
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!stripe || !priceId) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const user = await findUserByEmail(session.user.email);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let customerId = user.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await updateUserPlan(user.email, { stripeCustomerId: customerId });
  }

  const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?checkout=success`,
    cancel_url: `${origin}/pricing?checkout=cancel`,
    metadata: { userId: user.id, email: user.email },
  });

  return NextResponse.json({ url: checkout.url });
}
