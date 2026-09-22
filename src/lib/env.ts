/**
 * Runtime env helpers. Hosting is Netlify — prefer NEXT_PUBLIC_APP_URL,
 * then Netlify's automatic URL, then localhost for local dev.
 */

const NETLIFY_FALLBACK = "https://rococo-scone-8d41f1.netlify.app";

/**
 * Public site origin for redirects (Stripe success/cancel, emails, etc.).
 * On Netlify deploy-preview / branch deploys, prefer the deploy URL so Checkout
 * returns to the same host that created the session (avoids losing cookies).
 */
export function getAppUrl(): string {
  const context = (process.env.CONTEXT || "").trim();
  if (context && context !== "production") {
    const deploy =
      process.env.DEPLOY_PRIME_URL?.trim() ||
      process.env.DEPLOY_URL?.trim() ||
      process.env.URL?.trim();
    if (deploy) return deploy.replace(/\/$/, "");
  }

  const explicit =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.URL?.trim() ||
    process.env.DEPLOY_PRIME_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") return NETLIFY_FALLBACK;
  return "http://localhost:3000";
}

/** Prefer the browser Origin when it matches an allowed host (checkout API). */
export function resolveCheckoutOrigin(request: Request): string {
  const fallback = getAppUrl();
  const raw =
    request.headers.get("origin") ||
    (() => {
      try {
        return new URL(request.headers.get("referer") || "").origin;
      } catch {
        return "";
      }
    })();
  if (!raw) return fallback;
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    const allowed =
      host === "procurity.pro" ||
      host === "www.procurity.pro" ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".netlify.app");
    if (allowed) return u.origin;
  } catch {
    // ignore
  }
  return fallback;
}

export function isProduction() {
  return process.env.NODE_ENV === "production";
}
