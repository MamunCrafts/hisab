import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password", "/terms", "/privacy", "/offline", "/manifest.webmanifest"];

/**
 * Optimistic gate: anonymous visitors (no session cookie) are sent to /login.
 * Real session validation happens on the server in every layout, page,
 * action and route handler — this is only a fast first filter.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isPublic) return NextResponse.next();

  if (!getSessionCookie(request)) {
    const url = new URL("/login", request.url);
    if (pathname !== "/" && pathname !== "/dashboard") {
      url.searchParams.set("next", `${pathname}${search}`);
    }
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip API routes (they authorize themselves), Next internals and static files.
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons|apple-icon|icon|robots.txt|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml)$).*)",
  ],
};
