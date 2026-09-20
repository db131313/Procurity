/**
 * Allow only relative /app paths for post-login redirects (Plan My Day, etc.).
 */
export function safeAppNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value.startsWith("/app")) return null;
  if (value.startsWith("//") || value.includes("://")) return null;
  if (value.includes("\\") || value.includes("\n") || value.includes("\r")) {
    return null;
  }
  return value;
}
