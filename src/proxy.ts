import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "pc_session";

/**
 * Auth gate for the authenticated app only.
 *
 * Public/marketing routes MUST NOT appear in `config.matcher`:
 *   /, /login, /signup, /forgot-password, /pricing, /how-it-works, etc.
 *
 * Logged-in redirects away from /login|/signup live in those pages
 * (see getSession checks), not here — so the proxy never touches them.
 */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Defense in depth: even if the matcher is widened later, never gate public paths.
  if (!path.startsWith("/app")) {
    return NextResponse.next();
  }

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  if (!hasSession) {
    const login = new URL("/login", request.nextUrl.origin);
    login.searchParams.set("next", path);
    // Redirect — never 401 — so browsers and crawlers get a usable response.
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

/**
 * BEFORE (blocked public auth pages from ever skipping the proxy):
 *   matcher: ["/app/:path*", "/login", "/signup", "/forgot-password"]
 *
 * AFTER (only the authenticated app shell):
 *   matcher: ["/app/:path*"]
 */
export const config = {
  matcher: ["/app/:path*"],
};
