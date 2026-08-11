import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { signOutAction, saveOnboardingZips } from "@/app/actions/session";
import { PLAN_PRICING } from "@/lib/db/types";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const planLabel =
    user.plan === "trial"
      ? "Trial"
      : PLAN_PRICING[user.plan as keyof typeof PLAN_PRICING]?.name ?? user.plan;

  return (
    <main className="px-5 py-6 md:mx-auto md:max-w-xl md:px-8 md:py-8">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Settings</h1>
      <p className="mt-1 text-sm text-slate">Account, territory, and billing.</p>

      <section className="pc-card mt-6 p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-slate">
          Profile
        </p>
        <p className="mt-2 font-bold text-ink">{user.name || "Rep"}</p>
        <p className="text-sm text-slate">{user.email}</p>
        <p className="mt-2 text-xs font-semibold text-purple">
          Plan · {planLabel} · {user.zipAllowance} zips
        </p>
      </section>

      <section className="pc-card mt-4 p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-slate">
          Zip codes
        </p>
        <form action={saveOnboardingZips} className="mt-3 space-y-3">
          <textarea
            name="zips"
            defaultValue={user.zipCodes.join(", ")}
            rows={3}
            className="w-full rounded-2xl border border-line bg-offwhite px-3 py-2 text-sm outline-none ring-purple/30 focus:ring-2"
            placeholder="10001, 10019, 10118"
          />
          <button
            type="submit"
            className="pc-gradient-bg h-11 w-full rounded-full text-sm font-bold text-white"
          >
            Save zips
          </button>
        </form>
      </section>

      <div className="mt-4 grid gap-3">
        <Link
          href="/app/billing"
          className="pc-card flex items-center justify-between p-4 font-semibold text-ink"
        >
          Billing & plans
          <span className="text-slate">→</span>
        </Link>
        <Link
          href="/app/onboarding"
          className="pc-card flex items-center justify-between p-4 font-semibold text-ink"
        >
          Re-run onboarding
          <span className="text-slate">→</span>
        </Link>
      </div>

      <form action={signOutAction} className="mt-8">
        <button
          type="submit"
          className="h-12 w-full rounded-full border border-line bg-white text-sm font-bold text-ink"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
