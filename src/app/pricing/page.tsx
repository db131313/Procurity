import Link from "next/link";
import { LogoWordmark } from "@/components/mobile/Logo";
import { PhoneShell } from "@/components/mobile/PhoneShell";
import { UpgradeButton } from "@/components/UpgradeButton";
import { auth } from "@/lib/auth";
import { PRO_PRICE_DISPLAY, stripeConfigured } from "@/lib/stripe";

export default async function PricingPage() {
  const session = await auth();
  const configured = stripeConfigured();

  return (
    <PhoneShell>
      <main className="min-h-[100dvh] bg-white px-5 pb-10 pt-6">
        <LogoWordmark />
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-pc-ink">
          One seat. One daily weapon.
        </h1>
        <p className="mt-2 text-sm text-pc-slate">
          Mobile intel for signage reps who need the procurement window.
        </p>

        <div className="mt-6 space-y-4">
          <div className="rounded-3xl border border-pc-line p-5">
            <h2 className="text-xl font-bold">Free</h2>
            <p className="mt-1 text-3xl font-bold">$0</p>
            <ul className="mt-4 space-y-2 text-sm text-pc-slate">
              <li>• Top opportunities + scores</li>
              <li>• Free 3D map</li>
              <li>• Pipeline on this device</li>
            </ul>
            <Link
              href="/map"
              className="mt-5 inline-flex h-11 items-center rounded-full border border-pc-line px-4 text-sm font-bold"
            >
              Open map
            </Link>
          </div>

          <div className="rounded-3xl border border-violet-200 bg-violet-50/50 p-5">
            <h2 className="text-xl font-bold">{PRO_PRICE_DISPLAY.name}</h2>
            <p className="mt-1 text-3xl font-bold">
              ${PRO_PRICE_DISPLAY.amount}
              <span className="text-base font-medium text-pc-slate">/mo</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-pc-ink/80">
              {PRO_PRICE_DISPLAY.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
            <div className="mt-5">
              {session ? (
                session.user.plan === "pro" ? (
                  <Link
                    href="/map"
                    className="pc-gradient-bg inline-flex h-11 items-center rounded-full px-4 text-sm font-bold text-white"
                  >
                    You&apos;re on Pro
                  </Link>
                ) : (
                  <UpgradeButton
                    label={configured ? "Subscribe with Stripe" : "Activate Pro (demo)"}
                    className="pc-gradient-bg inline-flex h-11 items-center rounded-full px-4 text-sm font-bold text-white"
                  />
                )
              ) : (
                <Link
                  href="/signup"
                  className="pc-gradient-bg inline-flex h-11 items-center rounded-full px-4 text-sm font-bold text-white"
                >
                  Create account
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>
    </PhoneShell>
  );
}
