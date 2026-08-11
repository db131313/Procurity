"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  signInWithPassword,
  startDemoSession,
} from "@/app/actions/session";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    formData.set("mode", mode);
    startTransition(async () => {
      const result = await signInWithPassword(formData);
      if (result?.error) setError(result.error);
    });
  }

  function onDemo() {
    setError(null);
    startTransition(async () => {
      await startDemoSession();
    });
  }

  return (
    <div className="space-y-4">
      <form action={onSubmit} className="space-y-4">
        {mode === "signup" && (
          <label className="block space-y-1.5 text-sm font-semibold text-ink">
            <span>Name</span>
            <input
              name="name"
              className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none ring-purple/30 focus:ring-2"
              placeholder="Jordan Lee"
            />
          </label>
        )}
        <label className="block space-y-1.5 text-sm font-semibold text-ink">
          <span>Email</span>
          <input
            name="email"
            type="email"
            required
            defaultValue={mode === "login" ? "demo@procurity.pro" : undefined}
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none ring-purple/30 focus:ring-2"
            placeholder="you@company.com"
          />
        </label>
        <label className="block space-y-1.5 text-sm font-semibold text-ink">
          <span>Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            defaultValue={mode === "login" ? "demo1234" : undefined}
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none ring-purple/30 focus:ring-2"
            placeholder="••••••••"
          />
        </label>

        {error && (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="pc-gradient-bg flex h-14 w-full items-center justify-center rounded-full text-[15px] font-bold text-white disabled:opacity-60"
        >
          {pending
            ? "Working…"
            : mode === "login"
              ? "Log in"
              : "Create account"}
        </button>
      </form>

      <button
        type="button"
        disabled={pending}
        onClick={onDemo}
        className="flex h-12 w-full items-center justify-center rounded-full border border-line bg-offwhite text-sm font-bold text-ink disabled:opacity-60"
      >
        Try demo session
      </button>

      <p className="text-center text-sm text-slate">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link href="/signup" className="font-semibold text-purple">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have access?{" "}
            <Link href="/login" className="font-semibold text-purple">
              Log in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
