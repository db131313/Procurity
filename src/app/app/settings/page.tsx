import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdminEmail } from "@/lib/auth/admin";
import { signOutAction, saveOnboardingZips } from "@/app/actions/session";
import { formatPlanZipAccess, PLAN_PRICING } from "@/lib/db/types";
import { CoverageSelector } from "@/components/app/CoverageSelector";
import { ZipTerritoryPicker } from "@/components/app/ZipTerritoryPicker";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; allowance?: string; ok?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const sp = await searchParams;
  const planLabel =
    user.plan === "trial"
      ? "Trial"
      : PLAN_PRICING[user.plan as keyof typeof PLAN_PRICING]?.name ?? user.plan;
  const zipAccessLabel = formatPlanZipAccess(user.plan);
  const isPro = user.plan === "pro";
  const showAdmin = isAdminEmail(user.email);

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
          Plan · {planLabel} · {zipAccessLabel}
        </p>
      </section>

      <section className="pc-card mt-4 p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-slate">
          Zip codes
        </p>
        {isPro ? (
          <p className="mt-2 text-sm text-slate">
            Full US access — no zip restriction on your Pro plan. Optional focus
            zips below are for your own notes only and do not limit the map.
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate">
            Pick up to {user.zipAllowance} zip{" "}
            {user.zipAllowance === 1 ? "code" : "codes"} from the 8 live metros.
            Until you save a selection, the map shows no pins in your territory.
          </p>
        )}

        {sp.error === "uncovered" && (
          <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950">
            Every zip must be in a covered metro.
          </p>
        )}
        {sp.error === "zip_limit" && (
          <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950">
            Your plan allows up to {sp.allowance || user.zipAllowance} zip
            {(Number(sp.allowance) || user.zipAllowance) === 1 ? "" : "s"}.
          </p>
        )}
        {sp.ok === "1" && (
          <p className="mt-3 rounded-2xl border border-teal/30 bg-teal/10 px-3 py-2 text-sm font-semibold text-ink">
            Territory saved.
          </p>
        )}

        <form action={saveOnboardingZips} className="mt-3 space-y-3">
          {isPro ? (
            <textarea
              name="zips"
              defaultValue={user.zipCodes.join(", ")}
              rows={3}
              className="w-full rounded-2xl border border-line bg-offwhite px-3 py-2 text-sm outline-none ring-purple/30 focus:ring-2"
              placeholder="Optional — e.g. 10001"
            />
          ) : (
            <ZipTerritoryPicker
              allowance={user.zipAllowance}
              initialZips={user.zipCodes}
            />
          )}
          <button
            type="submit"
            className="pc-gradient-bg h-11 w-full rounded-full text-sm font-bold text-white"
          >
            {isPro ? "Save optional zips" : "Save zips"}
          </button>
        </form>
      </section>

      <section className="pc-card mt-4 p-5">
        <CoverageSelector />
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
        {showAdmin && (
          <Link
            href="/admin/dev-plan"
            className="pc-card flex items-center justify-between p-4 font-semibold text-ink"
          >
            Admin · Dev plan override
            <span className="text-slate">→</span>
          </Link>
        )}
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
