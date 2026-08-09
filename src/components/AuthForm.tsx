"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  loginAction,
  signupAction,
  type AuthFormState,
} from "@/app/actions/auth";

const initial: AuthFormState = {};

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const action = mode === "signin" ? loginAction : signupAction;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="mx-auto w-full max-w-md space-y-4">
      {mode === "signup" && (
        <label className="block space-y-1.5 text-sm">
          <span className="text-sand/70">Name</span>
          <input
            name="name"
            required
            className="w-full rounded-md border border-[var(--line)] bg-ink/50 px-3 py-2.5 outline-none ring-teal-bright/40 focus:ring-2"
            placeholder="Jordan Lee"
          />
        </label>
      )}
      <label className="block space-y-1.5 text-sm">
        <span className="text-sand/70">Email</span>
        <input
          name="email"
          type="email"
          required
          defaultValue={mode === "signin" ? "demo@procurity.pro" : undefined}
          className="w-full rounded-md border border-[var(--line)] bg-ink/50 px-3 py-2.5 outline-none ring-teal-bright/40 focus:ring-2"
          placeholder="you@company.com"
        />
      </label>
      <label className="block space-y-1.5 text-sm">
        <span className="text-sand/70">Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          defaultValue={mode === "signin" ? "demo1234" : undefined}
          className="w-full rounded-md border border-[var(--line)] bg-ink/50 px-3 py-2.5 outline-none ring-teal-bright/40 focus:ring-2"
          placeholder="••••••••"
        />
      </label>

      {state?.error && (
        <p className="rounded-md border border-amber/40 bg-amber/10 px-3 py-2 text-sm text-sand">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-teal px-4 py-2.5 font-semibold text-ink transition hover:bg-teal-bright disabled:opacity-60"
      >
        {pending
          ? "Working…"
          : mode === "signin"
            ? "Sign in"
            : "Create account"}
      </button>

      <p className="text-center text-sm text-sand/65">
        {mode === "signin" ? (
          <>
            New to Procurity.Pro?{" "}
            <Link href="/signup" className="text-teal-bright hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have access?{" "}
            <Link href="/signin" className="text-teal-bright hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>

      {mode === "signin" && (
        <p className="text-center text-xs text-sand/45">
          Demo: demo@procurity.pro / demo1234
        </p>
      )}
    </form>
  );
}
