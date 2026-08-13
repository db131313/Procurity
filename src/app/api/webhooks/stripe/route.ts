import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { updateUserPlan, upsertUser } from "@/lib/db/store";
import type { PlanTier } from "@/lib/db/types";

function tierFromMetadata(meta?: Stripe.Metadata | null): PlanTier {
  const tier = meta?.tier;
  if (tier === "starter" || tier === "growth" || tier === "pro") return tier;
  return "pro";
}

/** Stub webhook — verifies STRIPE_WEBHOOK_SECRET when configured. */
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
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const plan = tierFromMetadata(session.metadata);
        const email =
          session.metadata?.email ||
          session.customer_details?.email ||
          undefined;
        const customerId =
          typeof session.customer === "string" ? session.customer : null;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : null;
        const userId = session.metadata?.userId;

        if (userId) {
          await updateUserPlan(userId, plan, {
            customerId: customerId ?? undefined,
            subscriptionId,
          });
        } else if (email) {
          await upsertUser({
            firebaseUid: `stripe-${email}`,
            email,
            plan,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        // Downgrade handled when we can resolve user by customer id — stub OK.
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("Webhook handler error", error);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
