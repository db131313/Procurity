import Link from "next/link";
import { PricingCards } from "@/components/marketing/PricingCards";
import { getCurrentUser } from "@/lib/auth/session";
import { PLAN_PRICING } from "@/lib/db/types";
import { CheckoutButtons } from "./CheckoutButtons";

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const planLabel =
    user.plan === "trial"
      ? "Free trial"
      : PLAN_PRICING[user.plan as keyof typeof PLAN_PRICING]?.name ?? user.plan;

  return (
    <main className="px-5 py-6 md:px-8 md:py-8">
      <Link href="/app/settings" className="text-sm font-semibold text-purple">
        ← Settings
      </Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink md:text-3xl">
        Billing
      </h1>
      <p className="mt-1 text-sm text-slate">
        Current plan: <span className="font-semibold text-ink">{planLabel}</span>
        {user.trialEndsAt && user.plan === "trial"
          ? ` · trial ends ${new Date(user.trialEndsAt).toLocaleDateString()}`
          : ""}
      </p>

      <div className="mt-8">
        <PricingCards ctaHref="/signup" />
      </div>

      <div className="mx-auto mt-8 max-w-3xl">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate">
          Subscribe
        </h2>
        <CheckoutButtons />
      </div>
    </main>
  );
}
