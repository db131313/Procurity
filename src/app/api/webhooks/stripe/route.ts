import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { handleStripeWebhookEvent } from "@/lib/stripe/handle-webhook";

/**
 * Canonical Stripe webhook endpoint for Netlify.
 * Point Stripe Dashboard → Webhooks to:
 *   https://rococo-scone-8d41f1.netlify.app/api/webhooks/stripe
 * (swap to https://procurity.pro/... after DNS cutover)
 *
 * Events: checkout.session.completed,
 *         customer.subscription.updated,
 *         customer.subscription.deleted
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !secret) {
    return NextResponse.json(
      { error: "Webhook not configured", stub: true },
      { status: 501 },
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    console.error("Stripe webhook signature failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await handleStripeWebhookEvent(event);
  } catch (error) {
    console.error("Webhook handler error", error);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
