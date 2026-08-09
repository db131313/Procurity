import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export async function Nav({ solid = false }: { solid?: boolean }) {
  const session = await auth();

  return (
    <header
      className={`relative z-20 flex items-center justify-between px-5 py-5 md:px-10 ${
        solid ? "border-b border-[var(--line)] bg-[rgba(8,20,27,0.75)] backdrop-blur-md" : ""
      }`}
    >
      <Link href="/" className="brand-mark text-2xl font-bold tracking-tight md:text-3xl">
        Procurity<span className="text-teal-bright">.Pro</span>
      </Link>
      <nav className="flex items-center gap-3 text-sm text-sand/85 md:gap-5">
        <Link href="/pricing" className="hidden hover:text-sand sm:inline">
          Pricing
        </Link>
        {session?.user ? (
          <>
            <Link href="/dashboard" className="hover:text-sand">
              Today&apos;s Top 20
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="rounded-md border border-[var(--line)] px-3 py-1.5 transition hover:border-teal-bright/50 hover:text-sand"
              >
                Sign out
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/signin" className="hover:text-sand">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-teal px-3.5 py-1.5 font-medium text-ink transition hover:bg-teal-bright"
            >
              Get access
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
