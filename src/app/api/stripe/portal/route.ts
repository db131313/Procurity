import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { findUserByEmail } from "@/lib/users";

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!stripeConfigured()) {
    return NextResponse.json({ url: "/pricing" });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const user = await findUserByEmail(session.user.email);
  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: "No billing customer" }, { status: 400 });
  }

  const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const portal = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${origin}/dashboard`,
  });

  return NextResponse.json({ url: portal.url });
}
