import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { Logo } from "@/components/brand/Logo";

export default function LoginPage() {
  return (
    <main className="grid min-h-[100dvh] lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-ink text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse at 70% 20%, rgba(124,108,246,0.4), transparent 50%), radial-gradient(ellipse at 20% 80%, rgba(56,217,201,0.25), transparent 45%)",
          }}
        />
        <div className="relative z-10">
          <Logo variant="light" size={36} />
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold tracking-tight">
            Know who&apos;s ready to buy{" "}
            <span className="pc-gradient-text">before</span> they call.
          </h1>
          <p className="mt-4 text-white/70">
            Log in to your map, pipeline, and daily hot opportunities.
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
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-slate">
            Sign in with email or jump into the demo.
          </p>
          <div className="mt-8">
            <AuthForm mode="login" />
          </div>
          <p className="mt-8 text-center text-sm text-slate">
            <Link href="/" className="font-semibold text-purple">
              Back to home
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
