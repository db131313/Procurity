import Link from "next/link";
import { Nav } from "@/components/Nav";
import { UpgradeButton } from "@/components/UpgradeButton";
import { auth } from "@/lib/auth";
import { PRO_PRICE_DISPLAY, stripeConfigured } from "@/lib/stripe";

export default async function PricingPage() {
  const session = await auth();
  const configured = stripeConfigured();

  return (
    <div className="min-h-screen">
      <Nav solid />
      <main className="mx-auto max-w-5xl px-5 py-16 md:px-10">
        <div className="max-w-2xl">
          <p className="text-sm uppercase tracking-[0.22em] text-teal-bright/80">
            Pricing
          </p>
          <h1 className="brand-mark mt-3 text-4xl font-bold tracking-tight md:text-5xl">
            One seat. One daily weapon.
          </h1>
          <p className="mt-4 text-sand/65">
            Procurity.Pro is built for signage reps who need the procurement
            window — not a CRM full of cold names.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-[var(--line)] p-6">
            <h2 className="brand-mark text-2xl font-semibold">Free</h2>
            <p className="mt-2 text-3xl font-bold">$0</p>
            <ul className="mt-5 space-y-2 text-sm text-sand/65">
              <li>• Top 20 ranked sites</li>
              <li>• Probability scores & window labels</li>
              <li>• 3D map (with Mapbox token)</li>
              <li>• Contacts masked</li>
            </ul>
            <Link
              href={session ? "/dashboard" : "/signup"}
              className="mt-8 inline-block rounded-md border border-sand/25 px-4 py-2 text-sm font-medium hover:border-teal-bright/50"
            >
              {session ? "Open dashboard" : "Start free"}
            </Link>
          </div>

          <div className="rounded-xl border border-teal-bright/40 bg-teal/10 p-6">
            <h2 className="brand-mark text-2xl font-semibold">
              {PRO_PRICE_DISPLAY.name}
            </h2>
            <p className="mt-2 text-3xl font-bold">
              ${PRO_PRICE_DISPLAY.amount}
              <span className="text-base font-normal text-sand/60">/mo</span>
            </p>
            <ul className="mt-5 space-y-2 text-sm text-sand/75">
              {PRO_PRICE_DISPLAY.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
            <div className="mt-8">
              {session ? (
                session.user.plan === "pro" ? (
                  <Link
                    href="/dashboard"
                    className="inline-block rounded-md bg-teal px-4 py-2 text-sm font-semibold text-ink"
                  >
                    You&apos;re on Pro — go to brief
                  </Link>
                ) : (
                  <UpgradeButton label={configured ? "Subscribe with Stripe" : "Activate Pro (demo)"} />
                )
              ) : (
                <Link
                  href="/signup"
                  className="inline-block rounded-md bg-amber px-4 py-2 text-sm font-semibold text-ink"
                >
                  Create account to upgrade
                </Link>
              )}
            </div>
            {!configured && (
              <p className="mt-3 text-xs text-sand/45">
                Stripe keys not set — checkout upgrades the account in demo mode.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
