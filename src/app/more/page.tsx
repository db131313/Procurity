import Link from "next/link";
import { LogoWordmark } from "@/components/mobile/Logo";
import { PhoneShell } from "@/components/mobile/PhoneShell";
import { auth, signOut } from "@/lib/auth";

export default async function MorePage() {
  const session = await auth();

  return (
    <PhoneShell>
      <main className="min-h-[100dvh] bg-white px-5 pb-8 pt-6">
        <LogoWordmark />
        <h1 className="mt-6 text-2xl font-bold text-pc-ink">More</h1>
        <p className="mt-1 text-sm text-pc-slate">
          {session?.user
            ? `Signed in as ${session.user.email}`
            : "Browse intel, then sign in to save your pipeline."}
        </p>

        <div className="mt-6 space-y-2">
          <Link href="/pricing" className="block rounded-2xl bg-pc-mist px-4 py-3 text-sm font-semibold">
            Pricing
          </Link>
          <Link href="/dashboard" className="block rounded-2xl bg-pc-mist px-4 py-3 text-sm font-semibold">
            Desktop brief
          </Link>
          {session?.user ? (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="w-full rounded-2xl bg-pc-ink px-4 py-3 text-left text-sm font-semibold text-white"
              >
                Sign out
              </button>
            </form>
          ) : (
            <Link
              href="/signin"
              className="pc-gradient-bg block rounded-2xl px-4 py-3 text-center text-sm font-bold text-white"
            >
              Sign in
            </Link>
          )}
        </div>
      </main>
    </PhoneShell>
  );
}
