import { Nav } from "@/components/Nav";
import { AuthForm } from "@/components/AuthForm";

export default function SignInPage() {
  return (
    <div className="min-h-screen">
      <Nav solid />
      <main className="px-5 py-16 md:px-10">
        <div className="mx-auto max-w-lg text-center">
          <h1 className="brand-mark text-4xl font-bold tracking-tight">
            Sign in to Procurity<span className="text-teal-bright">.Pro</span>
          </h1>
          <p className="mt-3 text-sand/65">
            Pull today&apos;s Top 20 procurement windows and hit the street.
          </p>
        </div>
        <div className="mt-10">
          <AuthForm mode="signin" />
        </div>
      </main>
    </div>
  );
}
