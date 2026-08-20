import { createRemoteJWKSet, jwtVerify } from "jose";

const JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  ),
);

export type VerifiedFirebaseUser = {
  uid: string;
  email: string;
  name?: string;
  emailVerified: boolean;
};

/**
 * Verifies a Firebase ID token via Google's JWKS (no firebase-admin required).
 * Needs NEXT_PUBLIC_FIREBASE_PROJECT_ID set to the same project that issued the token.
 */
export async function verifyFirebaseIdToken(
  idToken: string,
): Promise<VerifiedFirebaseUser> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!projectId) {
    throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not configured");
  }
  if (!idToken?.trim()) {
    throw new Error("Missing ID token");
  }

  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  const uid = typeof payload.sub === "string" ? payload.sub : "";
  const email = typeof payload.email === "string" ? payload.email : "";
  if (!uid || !email) {
    throw new Error("Token missing uid or email");
  }

  return {
    uid,
    email: email.toLowerCase(),
    name: typeof payload.name === "string" ? payload.name : undefined,
    emailVerified: payload.email_verified === true,
  };
}
