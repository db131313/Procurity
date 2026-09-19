import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { saveOnboardingZips, completeProOnboarding } from "@/app/actions/session";
import { Logo } from "@/components/brand/Logo";
import { ZipTerritoryPicker } from "@/components/app/ZipTerritoryPicker";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; allowance?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const isPro = user.plan === "pro";

  if (isPro) {
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center px-5 py-10">
        <Logo variant="dark" size={36} />
        <h1 className="mt-8 text-3xl font-bold tracking-tight text-ink">
          Full US access
        </h1>
        <p className="mt-2 text-sm text-slate">
          Your Pro plan covers the entire US — no zip code pick required. Jump
          straight into opportunities, or optionally set focus zips in Settings
          later.
        </p>

        <form action={completeProOnboarding} className="mt-8">
          <button
            type="submit"
            className="pc-gradient-bg flex h-14 w-full items-center justify-center rounded-full text-sm font-bold text-white"
          >
            Start finding opportunities
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center px-5 py-10">
      <Logo variant="dark" size={36} />
      <h1 className="mt-8 text-3xl font-bold tracking-tight text-ink">
        Pick your territory
      </h1>
      <p className="mt-2 text-sm text-slate">
        Choose up to {user.zipAllowance} zip{" "}
        {user.zipAllowance === 1 ? "code" : "codes"} from the 8 live metros.
        Map pins are filtered to these zips server-side.
      </p>

      {sp.error === "uncovered" && (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950">
          Every zip must be in a covered metro (NYC, Chicago, LA, SF, Boston,
          Seattle, Fort Worth, or Miami-Dade).
        </p>
      )}
      {sp.error === "zip_limit" && (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950">
          Your plan allows up to {sp.allowance || user.zipAllowance} zip
          {(Number(sp.allowance) || user.zipAllowance) === 1 ? "" : "s"}.
        </p>
      )}

      <form action={saveOnboardingZips} className="mt-8 space-y-4">
        <ZipTerritoryPicker
          allowance={user.zipAllowance}
          initialZips={user.zipCodes}
        />
        <button
          type="submit"
          className="pc-gradient-bg flex h-14 w-full items-center justify-center rounded-full text-sm font-bold text-white"
        >
          Start finding opportunities
        </button>
      </form>
    </main>
  );
}
