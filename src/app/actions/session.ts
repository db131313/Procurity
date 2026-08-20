"use server";

import { redirect } from "next/navigation";
import {
  createSession,
  destroySession,
} from "@/lib/auth/session";
import { upsertUser, setUserZips } from "@/lib/db/store";
import { verifyFirebaseIdToken } from "@/lib/firebase/verify-id-token";
import { isFirebaseConfigured } from "@/lib/firebase/config";

export async function startDemoSession() {
  await upsertUser({
    firebaseUid: "demo-uid",
    email: "demo@procurity.pro",
    name: "Demo Rep",
    onboardingComplete: true,
    // Empty zip list = citywide (all five boroughs) in listProjects
    zipCodes: [],
    zipAllowance: 25,
    plan: "pro",
  });
  await createSession({
    uid: "demo-uid",
    email: "demo@procurity.pro",
    name: "Demo Rep",
    demo: true,
  });
  redirect("/app/home");
}

/**
 * After client-side Firebase Email/Password success, exchange the ID token
 * for an httpOnly pc_session cookie and upsert the app user row.
 */
export async function establishFirebaseSession(input: {
  idToken: string;
  name?: string | null;
  mode?: "login" | "signup";
}): Promise<{ error?: string; redirectTo?: string }> {
  try {
    const verified = await verifyFirebaseIdToken(input.idToken);
    const name = input.name?.trim() || verified.name || null;
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

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  // Prefer Firebase path — client should call establishFirebaseSession instead.
  // This remains for demo/dev when Firebase keys are absent.
  if (isFirebaseConfigured()) {
    return {
      error:
        "Firebase is configured — use the client sign-in flow (reload the page).",
    };
  }

  const uid = `local-${Buffer.from(email).toString("base64url").slice(0, 24)}`;
  const user = await upsertUser({
    firebaseUid: uid,
    email,
    name,
    onboardingComplete: mode === "login",
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
  redirect("/app/home");
}
