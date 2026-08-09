import { Nav } from "@/components/Nav";
import { AuthForm } from "@/components/AuthForm";

export default function SignUpPage() {
  return (
    <div className="min-h-screen">
      <Nav solid />
      <main className="px-5 py-16 md:px-10">
        <div className="mx-auto max-w-lg text-center">
          <h1 className="brand-mark text-4xl font-bold tracking-tight">
            Get Procurity<span className="text-teal-bright">.Pro</span>
          </h1>
          <p className="mt-3 text-sand/65">
            Create an account to unlock the daily visit brief for NYC signage
            sales.
          </p>
        </div>
        <div className="mt-10">
          <AuthForm mode="signup" />
        </div>
      </main>
    </div>
  );
}
