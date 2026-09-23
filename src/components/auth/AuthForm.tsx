"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  establishFirebaseSession,
  signInWithPassword,
} from "@/app/actions/session";
import {
  firebaseSignIn,
  firebaseSignUp,
  isFirebaseConfigured,
  mapFirebaseAuthError,
} from "@/lib/firebase/client";
import { CITY_COOKIE } from "@/lib/cities/picker";
import { safeAppNext } from "@/lib/route/safe-next";
import {
  normalizePromoCodeInput,
  PROMO_CODE_STORAGE_KEY,
} from "@/lib/stripe/promotion-codes";

type Props = {
  mode: "login" | "signup";
  /** City from teaser funnel */
  city?: string | null;
  /** When set, skip free map and start Stripe checkout after signup */
  checkout?: boolean;
  tier?: string | null;
  /** Safe /app path to continue after auth (e.g. Plan My Day). */
  next?: string | null;
  /** Prefill from ?code= on signup/login */
  initialPromoCode?: string | null;
};

function persistPromoCode(code: string) {
  const normalized = normalizePromoCodeInput(code);
  try {
    if (normalized) {
      sessionStorage.setItem(PROMO_CODE_STORAGE_KEY, normalized);
    } else {
      sessionStorage.removeItem(PROMO_CODE_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
  return normalized;
}

function readStoredPromoCode(): string {
  try {
    return normalizePromoCodeInput(
      sessionStorage.getItem(PROMO_CODE_STORAGE_KEY) || "",
    );
  } catch {
    return "";
  }
}

export function AuthForm({
  mode,
  city = null,
  checkout = false,
  tier = "growth",
  next = null,
  initialPromoCode = null,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [promoCode, setPromoCode] = useState(() =>
    normalizePromoCodeInput(initialPromoCode || ""),
  );
  const continueTo = safeAppNext(next);

  function persistCity() {
    if (!city) return;
    try {
      document.cookie = `${CITY_COOKIE}=${encodeURIComponent(city)};path=/;max-age=31536000;samesite=lax`;
    } catch {
      // ignore
    }
  }

  async function startCheckoutAndGo(codeOverride?: string) {
    persistCity();
    const code =
      normalizePromoCodeInput(codeOverride ?? promoCode) ||
      readStoredPromoCode();
    if (code) persistPromoCode(code);

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tier: tier || "growth",
        city: city || undefined,
        ...(code ? { promotionCode: code } : {}),
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
    const zip = String(formData.get("zip") || "").trim();
    const codeFromForm = normalizePromoCodeInput(
      String(formData.get("promoCode") || promoCode || ""),
    );
    if (codeFromForm) {
      setPromoCode(codeFromForm);
      persistPromoCode(codeFromForm);
    }

    startTransition(async () => {
      if (mode === "signup" && !checkout) {
        const digits = zip.replace(/\D/g, "");
        if (digits.length !== 5) {
          setError("Enter a valid 5-digit US zip code.");
          return;
        }
      }

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
            zip: mode === "signup" ? zip : undefined,
          });
          if (result.error) {
            setError(result.error);
            return;
          }

          if (checkout && mode === "signup") {
            try {
              await startCheckoutAndGo(codeFromForm);
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "Checkout unavailable",
              );
            }
            return;
          }

          persistCity();
          const dest =
            result.redirectTo?.startsWith("/waitlist")
              ? result.redirectTo
              : continueTo || result.redirectTo || mapPath();
          router.push(dest);
          router.refresh();
        } catch (err) {
          setError(mapFirebaseAuthError(err));
        }
        return;
      }

      formData.set("mode", mode);
      if (checkout) formData.set("checkout", "1");
      if (city) formData.set("city", city);
      if (continueTo) formData.set("next", continueTo);
      const result = await signInWithPassword(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (result?.needsCheckout) {
        try {
          await startCheckoutAndGo(codeFromForm);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Checkout unavailable",
          );
        }
        return;
      }
    });
  }

  const signupWithCodeHref = (() => {
    const params = new URLSearchParams();
    params.set("checkout", "1");
    params.set("tier", tier || "starter");
    if (city) params.set("city", city);
    if (continueTo) params.set("next", continueTo);
    const code = normalizePromoCodeInput(promoCode);
    if (code) params.set("code", code);
    return `/signup?${params.toString()}`;
  })();

  const pricingWithCodeHref = (() => {
    const code = normalizePromoCodeInput(promoCode);
    return code ? `/pricing?code=${encodeURIComponent(code)}` : "/pricing";
  })();

  return (
    <div className="space-y-4">
      {checkout && mode === "signup" && (
        <p className="rounded-2xl border border-teal/30 bg-teal/10 px-3 py-2 text-sm font-semibold text-ink">
          After signup you&apos;ll continue to checkout
          {city ? ` · then open the ${city.replace(/_/g, " ")} map` : ""}.
          Enter an access code below if you have one — it applies before
          payment.
        </p>
      )}
      {mode === "login" && (
        <div className="space-y-3 rounded-2xl border border-line bg-offwhite px-3 py-3 text-sm text-slate">
          <p>
            Need access or a free trial?{" "}
            <Link href={pricingWithCodeHref} className="font-semibold text-purple">
              Choose a plan
            </Link>{" "}
            and enter your access code on signup — or type it here first.
          </p>
          <label className="block space-y-1.5 text-sm font-semibold text-ink">
            <span>Have a code?</span>
            <input
              name="promoCodeLogin"
              value={promoCode}
              onChange={(e) =>
                setPromoCode(normalizePromoCodeInput(e.target.value))
              }
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-2xl border border-line bg-white px-4 py-3 font-mono text-sm uppercase tracking-wide outline-none ring-purple/30 focus:ring-2"
              placeholder="e.g. PC100"
            />
          </label>
          <Link
            href={signupWithCodeHref}
            className="inline-flex font-semibold text-purple hover:underline"
            onClick={() => {
              const code = normalizePromoCodeInput(promoCode);
              if (code) persistPromoCode(code);
            }}
          >
            Continue with code → create account
          </Link>
        </div>
      )}
      <form action={onSubmit} className="space-y-4">
        {mode === "signup" && !checkout && (
          <label className="block space-y-1.5 text-sm font-semibold text-ink">
            <span>Work zip code</span>
            <input
              name="zip"
              inputMode="numeric"
              pattern="[0-9]{5}"
              maxLength={10}
              required
              autoComplete="postal-code"
              className="w-full rounded-2xl border-2 border-ink/20 bg-white px-4 py-3.5 text-base outline-none ring-purple/30 focus:border-ink focus:ring-2"
              placeholder="e.g. 10001"
            />
            <span className="block text-xs font-medium text-slate">
              Required — we route you to your covered metro map (or the
              waitlist if we&apos;re not there yet).
            </span>
          </label>
        )}
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
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none ring-purple/30 focus:ring-2"
            placeholder="••••••••"
          />
        </label>

        {mode === "signup" && (
          <label className="block space-y-1.5 text-sm font-semibold text-ink">
            <span>
              Have a code?{" "}
              <span className="font-medium text-slate">(optional)</span>
            </span>
            <input
              name="promoCode"
              value={promoCode}
              onChange={(e) =>
                setPromoCode(normalizePromoCodeInput(e.target.value))
              }
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-2xl border border-line bg-white px-4 py-3 font-mono text-sm uppercase tracking-wide outline-none ring-purple/30 focus:ring-2"
              placeholder="Access / discount code"
            />
            <span className="block text-xs font-medium text-slate">
              {checkout
                ? "Applied automatically on Stripe Checkout before you pay."
                : "Saved for checkout when you pick a plan — or enter it again at payment."}
            </span>
          </label>
        )}

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

      <p className="text-center text-sm text-slate">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link
              href={
                city
                  ? `/signup?city=${encodeURIComponent(city)}&checkout=1&tier=${tier || "growth"}${continueTo ? `&next=${encodeURIComponent(continueTo)}` : ""}${promoCode ? `&code=${encodeURIComponent(normalizePromoCodeInput(promoCode))}` : ""}`
                  : continueTo
                    ? `/signup?next=${encodeURIComponent(continueTo)}${promoCode ? `&code=${encodeURIComponent(normalizePromoCodeInput(promoCode))}` : ""}`
                    : promoCode
                      ? `/signup?code=${encodeURIComponent(normalizePromoCodeInput(promoCode))}`
                      : "/signup"
              }
              className="font-semibold text-purple"
              onClick={() => {
                const code = normalizePromoCodeInput(promoCode);
                if (code) persistPromoCode(code);
              }}
            >
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have access?{" "}
            <Link
              href={
                continueTo
                  ? `/login?next=${encodeURIComponent(continueTo)}`
                  : "/login"
              }
              className="font-semibold text-purple"
            >
              Log in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
