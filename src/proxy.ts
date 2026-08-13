import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "pc_session";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const isApp = path.startsWith("/app");
  const isAuthPage =
    path === "/login" ||
    path === "/signup" ||
    path.startsWith("/login/") ||
    path.startsWith("/signup/");

  if (isApp && !hasSession) {
    const login = new URL("/login", request.nextUrl.origin);
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL("/app/home", request.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/login", "/signup"],
};
