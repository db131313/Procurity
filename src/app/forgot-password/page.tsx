import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { Logo } from "@/components/brand/Logo";
import { redirectIfAuthenticated } from "@/lib/auth/redirect-if-authenticated";

export default async function ForgotPasswordPage() {
  await redirectIfAuthenticated();

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
            Reset your password
          </h1>
          <p className="mt-4 text-white/70">
            We&apos;ll email you a secure link from Firebase Auth.
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
            Forgot password
          </h2>
          <p className="mt-2 text-sm text-slate">
            Enter the email on your account and we&apos;ll send a reset link.
          </p>
          <div className="mt-8">
            <ForgotPasswordForm />
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
