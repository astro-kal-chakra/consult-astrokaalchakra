import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { ACCESS_COOKIE, BACKEND, REFRESH_COOKIE, isLive } from "@/lib/auth/tokens";

/** Clears the session (and, with the live backend, revokes its refresh token) and goes to the login page. */
export async function GET(request) {
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (isLive() && refresh) {
    await fetch(`${BACKEND}/auth/logout`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-app-platform": "web", "x-app-version": "99.0.0" },
      body: JSON.stringify({ refreshToken: refresh }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    }).catch(() => {});
  }
  const res = NextResponse.redirect(new URL("/login", request.url));
  [SESSION_COOKIE, ACCESS_COOKIE, REFRESH_COOKIE].forEach((c) => res.cookies.delete(c));
  return res;
}
export const POST = GET;
