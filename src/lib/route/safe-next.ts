/**
 * Allow only relative in-app paths for post-login redirects
 * (Plan My Day, admin tools, etc.).
 */
export function safeAppNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (value.startsWith("//") || value.includes("://")) return null;
  if (value.includes("\\") || value.includes("\n") || value.includes("\r")) {
    return null;
  }
  // Authenticated app shell + internal admin tools only.
  if (value.startsWith("/app") || value.startsWith("/admin")) {
    return value;
  }
  return null;
}
