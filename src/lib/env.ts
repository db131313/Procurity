/**
 * Runtime env helpers. Hosting is Netlify — prefer NEXT_PUBLIC_APP_URL,
 * then Netlify's automatic URL, then localhost for local dev.
 */

const NETLIFY_FALLBACK = "https://rococo-scone-8d41f1.netlify.app";

export function getAppUrl(): string {
  const explicit =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.URL?.trim() || // Netlify injects deploy URL
    process.env.DEPLOY_PRIME_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") return NETLIFY_FALLBACK;
  return "http://localhost:3000";
}

export function isProduction() {
  return process.env.NODE_ENV === "production";
}
