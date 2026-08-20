/**
 * Firebase Auth client — all config from NEXT_PUBLIC_FIREBASE_* env vars.
 * When keys are missing, isFirebaseConfigured() is false and the UI falls
 * back to demo / local scaffold auth.
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  type Auth,
  type UserCredential,
} from "firebase/auth";
import { isFirebaseConfigured, readFirebaseConfig } from "./config";

export { isFirebaseConfigured } from "./config";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

export function getFirebaseApp() {
  if (!isFirebaseConfigured()) return null;
  if (!app) {
    const config = readFirebaseConfig();
    app = getApps()[0] ?? initializeApp(config);
  }
  return app;
}

export function getFirebaseAuth() {
  const a = getFirebaseApp();
  if (!a) return null;
  if (!auth) auth = getAuth(a);
  return auth;
}

export async function firebaseSignUp(
  email: string,
  password: string,
  name?: string,
): Promise<UserCredential> {
  const a = getFirebaseAuth();
  if (!a) throw new Error("Firebase is not configured");
  const cred = await createUserWithEmailAndPassword(a, email, password);
  if (name?.trim() && cred.user) {
    await updateProfile(cred.user, { displayName: name.trim() });
  }
  return cred;
}

export async function firebaseSignIn(email: string, password: string) {
  const a = getFirebaseAuth();
  if (!a) throw new Error("Firebase is not configured");
  return signInWithEmailAndPassword(a, email, password);
}

export async function firebaseSendPasswordReset(email: string) {
  const a = getFirebaseAuth();
  if (!a) throw new Error("Firebase is not configured");
  const origin =
    typeof window !== "undefined" ? window.location.origin : undefined;
  await sendPasswordResetEmail(
    a,
    email,
    origin ? { url: `${origin}/login` } : undefined,
  );
}

export function mapFirebaseAuthError(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: string }).code)
      : "";
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again in a few minutes.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return err instanceof Error ? err.message : "Authentication failed.";
  }
}
