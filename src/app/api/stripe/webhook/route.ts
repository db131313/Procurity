import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { updateUserByCustomerId, updateUserPlan } from "@/lib/users";

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 501 });
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
    console.error(err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
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
        if (email) {
          await updateUserPlan(email, {
            plan: "pro",
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
          });
        } else if (customerId) {
          await updateUserByCustomerId(customerId, {
            plan: "pro",
            stripeSubscriptionId: subscriptionId,
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : null;
        if (customerId) {
          await updateUserByCustomerId(customerId, {
            plan: "free",
            stripeSubscriptionId: null,
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : null;
        if (customerId) {
          const active = ["active", "trialing"].includes(sub.status);
          await updateUserByCustomerId(customerId, {
            plan: active ? "pro" : "free",
            stripeSubscriptionId: sub.id,
          });
        }
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
