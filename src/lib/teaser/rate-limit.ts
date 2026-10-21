/**
 * Simple in-memory rate limiter for anonymous teaser street-view access.
 * Netlify-safe (no disk). Resets per cold start — good enough to blunt abuse.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimitOk(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("x-nf-client-connection-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
