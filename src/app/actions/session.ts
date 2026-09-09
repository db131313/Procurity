"use server";

import { redirect } from "next/navigation";
import {
  createSession,
  destroySession,
} from "@/lib/auth/session";
import { upsertUser, setUserZips } from "@/lib/db/store";
import { PLAN_LIMITS } from "@/lib/db/types";
import { verifyFirebaseIdToken } from "@/lib/firebase/verify-id-token";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { normalizeUsZip, zipToMetro } from "@/lib/geo/zip-to-metro";
import { setCityCookie } from "@/lib/map/city-cookie";

export async function startDemoSession() {
  await upsertUser({
    firebaseUid: "demo-uid",
    email: "demo@procurity.pro",
    name: "Demo Rep",
    onboardingComplete: true,
    // Empty zip list + pro = unrestricted map access (demo stays citywide / Full US)
    zipCodes: [],
    zipAllowance: PLAN_LIMITS.pro,
    plan: "pro",
  });
  await createSession({
    uid: "demo-uid",
    email: "demo@procurity.pro",
    name: "Demo Rep",
    demo: true,
  });
  await setCityCookie("nyc");
  redirect("/app/map?city=nyc");
}

/**
 * After client-side Firebase Email/Password success, exchange the ID token
 * for an httpOnly pc_session cookie and upsert the app user row.
 */
export async function establishFirebaseSession(input: {
  idToken: string;
  name?: string | null;
  mode?: "login" | "signup";
  zip?: string | null;
}): Promise<{ error?: string; redirectTo?: string }> {
  try {
    const verified = await verifyFirebaseIdToken(input.idToken);
    const name = input.name?.trim() || verified.name || null;
    const isSignup = input.mode === "signup";
    const zip = isSignup ? normalizeUsZip(input.zip || "") : null;

    if (isSignup) {
      if (!zip) {
        return { error: "Enter a valid 5-digit US zip code." };
      }
      const metro = zipToMetro(zip);
      if (!metro.covered) {
        return { redirectTo: `/waitlist?zip=${encodeURIComponent(zip)}` };
      }

      const user = await upsertUser({
        firebaseUid: verified.uid,
        email: verified.email,
        name,
        zipCodes: [zip],
        onboardingComplete: true,
      });
      await setUserZips(user.id, [zip]);
      await createSession({
        uid: verified.uid,
        email: verified.email,
        name: name ?? undefined,
      });
      await setCityCookie(metro.city);
      return { redirectTo: `/app/map?city=${metro.city}` };
    }

    const user = await upsertUser({
      firebaseUid: verified.uid,
      email: verified.email,
      name,
    });

    await createSession({
      uid: verified.uid,
      email: verified.email,
      name: name ?? undefined,
    });

    const redirectTo = user.onboardingComplete
      ? "/app/home"
      : "/app/onboarding";
    return { redirectTo };
  } catch (err) {
    console.error("establishFirebaseSession", err);
    return {
      error:
        err instanceof Error
          ? err.message
          : "Could not establish session. Try again.",
    };
  }
}

/**
 * Local/dev fallback when Firebase env vars are not set yet.
 * Production with Firebase configured should never hit this path from the UI.
 */
export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const name = String(formData.get("name") || "").trim() || null;
  const mode = String(formData.get("mode") || "login");
  const zipRaw = String(formData.get("zip") || "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  if (isFirebaseConfigured()) {
    return {
      error:
        "Firebase is configured — use the client sign-in flow (reload the page).",
    };
  }

  if (mode === "signup") {
    const zip = normalizeUsZip(zipRaw);
    if (!zip) {
      return { error: "Enter a valid 5-digit US zip code." };
    }
    const metro = zipToMetro(zip);
    if (!metro.covered) {
      redirect(`/waitlist?zip=${encodeURIComponent(zip)}`);
    }

    const uid = `local-${Buffer.from(email).toString("base64url").slice(0, 24)}`;
    const user = await upsertUser({
      firebaseUid: uid,
      email,
      name,
      zipCodes: [zip],
      onboardingComplete: true,
    });
    await setUserZips(user.id, [zip]);
    await createSession({ uid, email, name: name ?? undefined });
    await setCityCookie(metro.city);
    redirect(`/app/map?city=${metro.city}`);
  }

  const uid = `local-${Buffer.from(email).toString("base64url").slice(0, 24)}`;
  const user = await upsertUser({
    firebaseUid: uid,
    email,
    name,
    onboardingComplete: true,
  });

  await createSession({ uid, email, name: name ?? undefined });

  if (!user.onboardingComplete) {
    redirect("/app/onboarding");
  }
  redirect("/app/home");
}

export async function signOutAction() {
  await destroySession();
  redirect("/");
}

export async function saveOnboardingZips(formData: FormData): Promise<void> {
  const { getCurrentUser } = await import("@/lib/auth/session");
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const zips = String(formData.get("zips") || "")
    .split(/[\s,]+/)
    .map((z) => z.trim())
    .filter((z) => /^\d{5}$/.test(z));

  const result = await setUserZips(user.id, zips);
  if (!result.ok) {
    if (result.reason === "limit") {
      redirect(`/app/settings?error=zip_limit&allowance=${result.allowance}`);
    }
    redirect("/app/settings?error=save_failed");
  }

  const first = zips[0];
  if (first) {
    const metro = zipToMetro(first);
    if (metro.covered) {
      await setCityCookie(metro.city);
      redirect(`/app/map?city=${metro.city}`);
    }
  }
  redirect("/app/home");
}

/** Pro onboarding: no zip pick required — mark complete and enter the app. */
export async function completeProOnboarding(): Promise<void> {
  const { getCurrentUser } = await import("@/lib/auth/session");
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  await upsertUser({
    firebaseUid: user.firebaseUid,
    email: user.email,
    name: user.name,
    plan: user.plan,
    zipCodes: user.zipCodes,
    zipAllowance: user.zipAllowance,
    onboardingComplete: true,
  });
  redirect("/app/home");
}
