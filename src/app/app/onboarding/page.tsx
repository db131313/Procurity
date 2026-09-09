import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { saveOnboardingZips, completeProOnboarding } from "@/app/actions/session";
import { Logo } from "@/components/brand/Logo";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

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
        Add up to {user.zipAllowance} zip{" "}
        {user.zipAllowance === 1 ? "code" : "codes"}. We&apos;ll score projects
        in those areas every day.
      </p>

      <form action={saveOnboardingZips} className="mt-8 space-y-4">
        <label className="block space-y-1.5 text-sm font-semibold text-ink">
          <span>Zip codes</span>
          <textarea
            name="zips"
            required
            rows={4}
            defaultValue={user.zipCodes.join(", ") || "10001"}
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none ring-purple/30 focus:ring-2"
            placeholder={
              user.zipAllowance === 1 ? "10001" : "10001, 10019, 10118"
            }
          />
        </label>
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
