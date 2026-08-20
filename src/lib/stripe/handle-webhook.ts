import type Stripe from "stripe";
import {
  getUserByEmail,
  getUserByStripeCustomerId,
  updateUserPlan,
  upsertUser,
} from "@/lib/db/store";
import type { PlanTier } from "@/lib/db/types";

function tierFromMetadata(meta?: Stripe.Metadata | null): PlanTier {
  const tier = meta?.tier;
  if (tier === "starter" || tier === "growth" || tier === "pro") return tier;
  return "pro";
}

function planFromSubscription(sub: Stripe.Subscription): PlanTier {
  const metaTier = tierFromMetadata(sub.metadata);
  if (metaTier !== "pro" || sub.metadata?.tier) return metaTier;
  // Fall back: map price id → tier via env
  const priceId =
    typeof sub.items.data[0]?.price?.id === "string"
      ? sub.items.data[0].price.id
      : "";
  if (
    priceId &&
    (priceId === process.env.STRIPE_PRICE_ID_STARTER ||
      priceId === process.env.STRIPE_PRICE_STARTER)
  ) {
    return "starter";
  }
  if (
    priceId &&
    (priceId === process.env.STRIPE_PRICE_ID_GROWTH ||
      priceId === process.env.STRIPE_PRICE_GROWTH)
  ) {
    return "growth";
  }
  if (
    priceId &&
    (priceId === process.env.STRIPE_PRICE_ID_PRO ||
      priceId === process.env.STRIPE_PRICE_PRO)
  ) {
    return "pro";
  }
  return "pro";
}

async function applyPlanForCustomer(
  customerId: string | null,
  plan: PlanTier,
  subscriptionId: string | null,
  email?: string | null,
  userId?: string | null,
) {
  if (userId) {
    await updateUserPlan(userId, plan, {
      customerId: customerId ?? undefined,
      subscriptionId,
    });
    return;
  }
  if (customerId) {
    const byCustomer = await getUserByStripeCustomerId(customerId);
    if (byCustomer) {
      await updateUserPlan(byCustomer.id, plan, {
        customerId,
        subscriptionId,
      });
      return;
    }
  }
  if (email) {
    const existing = await getUserByEmail(email);
    if (existing) {
      await updateUserPlan(existing.id, plan, {
        customerId: customerId ?? undefined,
        subscriptionId,
      });
      return;
    }
    await upsertUser({
      firebaseUid: `stripe-${email.toLowerCase()}`,
      email: email.toLowerCase(),
      plan,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
    });
  }
}

/** Shared Stripe webhook event handler (Checkout + subscription lifecycle). */
export async function handleStripeWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode && session.mode !== "subscription") break;
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
      const userId = session.metadata?.userId ?? null;
      await applyPlanForCustomer(
        customerId,
        plan,
        subscriptionId,
        email,
        userId,
      );
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : null;
      const active = ["active", "trialing", "past_due"].includes(sub.status);
      const plan: PlanTier = active ? planFromSubscription(sub) : "trial";
      await applyPlanForCustomer(customerId, plan, active ? sub.id : null);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : null;
      await applyPlanForCustomer(customerId, "trial", null);
      break;
    }
    default:
      break;
  }
}
