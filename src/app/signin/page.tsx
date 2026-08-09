import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { LogoWordmark } from "@/components/mobile/Logo";
import { PhoneShell } from "@/components/mobile/PhoneShell";

export default function SignInPage() {
  return (
    <PhoneShell showNav={false}>
      <main className="min-h-[100dvh] bg-white px-6 pb-10 pt-8">
        <LogoWordmark />
        <h1 className="mt-8 text-3xl font-bold tracking-tight text-pc-ink">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-pc-slate">
          Sign in to save pipeline deals and unlock Pro contacts.
        </p>
        <div className="mt-8">
          <AuthForm mode="signin" />
        </div>
        <p className="mt-6 text-center text-sm text-pc-slate">
          <Link href="/" className="font-semibold text-pc-purple">
            Back to welcome
          </Link>
        </p>
      </main>
    </PhoneShell>
  );
}
