import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { Logo } from "@/components/brand/Logo";
import { redirectIfAuthenticated } from "@/lib/auth/redirect-if-authenticated";
import { getPickerCity } from "@/lib/cities/picker";

type Props = {
  searchParams: Promise<{
    city?: string;
    checkout?: string;
    tier?: string;
  }>;
};

export default async function SignUpPage({ searchParams }: Props) {
  const sp = await searchParams;
  const city = typeof sp.city === "string" ? sp.city : null;
  const checkout = sp.checkout === "1" || sp.checkout === "true";
  const tier = typeof sp.tier === "string" ? sp.tier : "growth";
  const picker = getPickerCity(city);

  const afterAuth = city
    ? `/app/map?city=${encodeURIComponent(city)}`
    : "/app/home";
  await redirectIfAuthenticated(checkout ? afterAuth : "/app/home");

  return (
    <main className="grid min-h-[100dvh] lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-ink text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse at 30% 30%, rgba(124,108,246,0.45), transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(56,217,201,0.28), transparent 45%)",
          }}
        />
        <div className="relative z-10">
          <Logo variant="light" size={36} />
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold tracking-tight">
            {picker ? (
              <>
                Unlock {picker.label}.{" "}
                <span className="pc-gradient-text">Full map.</span>
              </>
            ) : (
              <>
                Start selling smarter.{" "}
                <span className="pc-gradient-text">Map first.</span>
              </>
            )}
          </h1>
          <p className="mt-4 text-white/70">
            {checkout
              ? "Create your account, complete checkout, then land on your city’s live permit map with Buy Scores."
              : "Create an account to open the full map, scores, and pipeline."}
          </p>
        </div>
        <p className="relative z-10 text-xs text-white/40">© Procurity</p>
      </section>

      <section className="flex flex-col justify-center bg-white px-5 py-10 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="lg:hidden">
            <Logo variant="dark" size={32} />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-ink lg:mt-0">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-slate">
            {checkout
              ? "No free map access — checkout unlocks the full product."
              : "Sign up to access the live map and scores."}
          </p>
          <div className="mt-8">
            <AuthForm
              mode="signup"
              city={city}
              checkout={checkout}
              tier={tier}
            />
          </div>
          <p className="mt-8 text-center text-sm text-slate">
            <Link href={city ? `/teaser/${city}` : "/"} className="font-semibold text-purple">
              Back
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
