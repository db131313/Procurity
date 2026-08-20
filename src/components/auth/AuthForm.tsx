"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  establishFirebaseSession,
  signInWithPassword,
  startDemoSession,
} from "@/app/actions/session";
import {
  firebaseSignIn,
  firebaseSignUp,
  isFirebaseConfigured,
  mapFirebaseAuthError,
} from "@/lib/firebase/client";
import { CITY_COOKIE } from "@/lib/cities/picker";

type Props = {
  mode: "login" | "signup";
  /** City from teaser funnel */
  city?: string | null;
  /** When set, skip free map and start Stripe checkout after signup */
  checkout?: boolean;
  tier?: string | null;
};

export function AuthForm({
  mode,
  city = null,
  checkout = false,
  tier = "growth",
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const firebaseReady =
    typeof window !== "undefined" ? isFirebaseConfigured() : false;

  function persistCity() {
    if (!city) return;
    try {
      document.cookie = `${CITY_COOKIE}=${encodeURIComponent(city)};path=/;max-age=31536000;samesite=lax`;
    } catch {
      // ignore
    }
  }

  async function startCheckoutAndGo() {
    persistCity();
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tier: tier || "growth",
        city: city || undefined,
      }),
    });
    const data = (await res.json()) as {
      url?: string;
      error?: string;
      demo?: boolean;
    };
    if (!res.ok || !data.url) {
      throw new Error(data.error || "Checkout unavailable");
    }
    window.location.href = data.url;
  }

  function mapPath() {
    return city
      ? `/app/map?city=${encodeURIComponent(city)}`
      : "/app/map";
  }

  function onSubmit(formData: FormData) {
    setError(null);
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");
    const name = String(formData.get("name") || "").trim() || undefined;

    startTransition(async () => {
      if (isFirebaseConfigured()) {
        try {
          const cred =
            mode === "signup"
              ? await firebaseSignUp(email, password, name)
              : await firebaseSignIn(email, password);
          const idToken = await cred.user.getIdToken();
          const result = await establishFirebaseSession({
            idToken,
            name: name || cred.user.displayName,
            mode,
            skipOnboarding: Boolean(checkout && mode === "signup"),
            city: city || undefined,
          });
          if (result.error) {
            setError(result.error);
            return;
          }

          if (checkout && mode === "signup") {
            await startCheckoutAndGo();
            return;
          }

          persistCity();
          router.push(result.redirectTo || mapPath());
          router.refresh();
        } catch (err) {
          setError(mapFirebaseAuthError(err));
        }
        return;
      }

      formData.set("mode", mode);
      if (checkout) formData.set("checkout", "1");
      if (city) formData.set("city", city);
      const result = await signInWithPassword(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (result?.needsCheckout) {
        await startCheckoutAndGo();
        return;
      }
    });
  }

  function onDemo() {
    setError(null);
    startTransition(async () => {
      persistCity();
      await startDemoSession(city || undefined);
    });
  }

  return (
    <div className="space-y-4">
      {checkout && mode === "signup" && (
        <p className="rounded-2xl border border-teal/30 bg-teal/10 px-3 py-2 text-sm font-semibold text-ink">
          After signup you&apos;ll continue to checkout
          {city ? ` · then open the ${city.replace(/_/g, " ")} map` : ""}.
        </p>
      )}
      <form action={onSubmit} className="space-y-4">
        {mode === "signup" && (
          <label className="block space-y-1.5 text-sm font-semibold text-ink">
            <span>Name</span>
            <input
              name="name"
              autoComplete="name"
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
            autoComplete="email"
            defaultValue={
              mode === "login" && !firebaseReady
                ? "demo@procurity.pro"
                : undefined
            }
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
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            defaultValue={
              mode === "login" && !firebaseReady ? "demo1234" : undefined
            }
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none ring-purple/30 focus:ring-2"
            placeholder="••••••••"
          />
        </label>

        {mode === "login" && (
          <p className="text-right text-sm">
            <Link
              href="/forgot-password"
              className="font-semibold text-purple hover:underline"
            >
              Forgot password?
            </Link>
          </p>
        )}

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
              : checkout
                ? "Create account & continue to payment"
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
            <Link
              href={
                city
                  ? `/signup?city=${encodeURIComponent(city)}&checkout=1&tier=${tier || "growth"}`
                  : "/signup"
              }
              className="font-semibold text-purple"
            >
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
