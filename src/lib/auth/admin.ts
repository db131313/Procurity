/**
 * Server-side admin allow-list for internal tools (e.g. /admin/dev-plan).
 * Never import this into client components — emails stay on the server.
 *
 * Env:
 *   ADMIN_EMAILS=a@x.com,b@y.com   (comma-separated)
 *   ADMIN_EMAIL=a@x.com            (single; merged with ADMIN_EMAILS)
 */

function parseAdminEmails(): string[] {
  const fromList = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const single = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (single && !fromList.includes(single)) fromList.push(single);
  return fromList;
}

export function getAdminEmails(): string[] {
  return parseAdminEmails();
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = parseAdminEmails();
  if (allow.length === 0) return false;
  return allow.includes(email.trim().toLowerCase());
}
