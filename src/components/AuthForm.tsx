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
    <form action={formAction} className="space-y-4">
      {mode === "signup" && (
        <label className="block space-y-1.5 text-sm font-medium text-pc-ink">
          <span>Name</span>
          <input
            name="name"
            required
            className="w-full rounded-2xl border border-pc-line bg-white px-4 py-3 outline-none ring-pc-purple/30 focus:ring-2"
            placeholder="Jordan Lee"
          />
        </label>
      )}
      <label className="block space-y-1.5 text-sm font-medium text-pc-ink">
        <span>Email</span>
        <input
          name="email"
          type="email"
          required
          defaultValue={mode === "signin" ? "demo@procurity.pro" : undefined}
          className="w-full rounded-2xl border border-pc-line bg-white px-4 py-3 outline-none ring-pc-purple/30 focus:ring-2"
          placeholder="you@company.com"
        />
      </label>
      <label className="block space-y-1.5 text-sm font-medium text-pc-ink">
        <span>Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          defaultValue={mode === "signin" ? "demo1234" : undefined}
          className="w-full rounded-2xl border border-pc-line bg-white px-4 py-3 outline-none ring-pc-purple/30 focus:ring-2"
          placeholder="••••••••"
        />
      </label>

      {state?.error && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="pc-gradient-bg flex h-14 w-full items-center justify-center rounded-full text-[16px] font-bold text-white disabled:opacity-60"
      >
        {pending ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
      </button>

      <p className="text-center text-sm text-pc-slate">
        {mode === "signin" ? (
          <>
            New here?{" "}
            <Link href="/signup" className="font-semibold text-pc-purple">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have access?{" "}
            <Link href="/signin" className="font-semibold text-pc-purple">
              Sign in
            </Link>
          </>
        )}
      </p>

      {mode === "signin" && (
        <p className="text-center text-xs text-pc-slate/80">
          Demo: demo@procurity.pro / demo1234
        </p>
      )}
    </form>
  );
}
