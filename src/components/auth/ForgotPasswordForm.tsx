"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  firebaseSendPasswordReset,
  isFirebaseConfigured,
  mapFirebaseAuthError,
} from "@/lib/firebase/client";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    const email = String(formData.get("email") || "").trim().toLowerCase();
    if (!email) {
      setError("Email is required.");
      return;
    }

    startTransition(async () => {
      if (!isFirebaseConfigured()) {
        setError(
          "Password reset will work as soon as Firebase env vars are set in Netlify. Demo accounts do not use email reset.",
        );
        return;
      }
      try {
        await firebaseSendPasswordReset(email);
        setSent(true);
      } catch (err) {
        setError(mapFirebaseAuthError(err));
      }
    });
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <p className="rounded-2xl border border-teal/30 bg-teal/10 px-4 py-3 text-sm text-ink">
          If an account exists for that email, a reset link is on its way. Check
          your inbox (and spam).
        </p>
        <p className="text-center text-sm text-slate">
          <Link href="/login" className="font-semibold text-purple">
            Back to log in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form action={onSubmit} className="space-y-4">
        <label className="block space-y-1.5 text-sm font-semibold text-ink">
          <span>Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none ring-purple/30 focus:ring-2"
            placeholder="you@company.com"
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
          {pending ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="text-center text-sm text-slate">
        <Link href="/login" className="font-semibold text-purple">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
