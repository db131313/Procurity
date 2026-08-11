"use server";

import { redirect } from "next/navigation";
import {
  createSession,
  destroySession,
} from "@/lib/auth/session";
import { upsertUser, setUserZips } from "@/lib/db/store";

export async function startDemoSession() {
  await upsertUser({
    firebaseUid: "demo-uid",
    email: "demo@procurity.pro",
    name: "Demo Rep",
    onboardingComplete: true,
    zipCodes: ["10001", "10019", "10118"],
  });
  await createSession({
    uid: "demo-uid",
    email: "demo@procurity.pro",
    name: "Demo Rep",
    demo: true,
  });
  redirect("/app/home");
}

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const name = String(formData.get("name") || "").trim() || null;
  const mode = String(formData.get("mode") || "login");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  // PLACEHOLDER: When Firebase is configured, exchange credentials via client SDK
  // and call createSession with the Firebase UID. Until then, local demo accounts.
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
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
