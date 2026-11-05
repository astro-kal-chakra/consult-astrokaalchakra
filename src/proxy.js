import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, isLive, refreshTokens, secondsLeft, tokenCookie } from "@/lib/auth/tokens";

const SESSION_COOKIE = "kc_consult_session";
/** Refresh a little before the backend access token expires, so a page never starts with a dying token. */
const REFRESH_BEFORE_SEC = 60;

/**
 * Fast redirects only: signed-in areas need the session cookie. Which role may open what (astrologer
 * dashboard vs customer pages) and the cookie's signature are checked on the server by every page / action.
 * Live backend: also renews the backend access token (httpOnly cookies) before it expires.
 * (The Personal Consultation Admin lives in the main dashboard project at /saas and calls /api/saas-admin.)
 */
export async function proxy(request) {
  const { pathname, search } = request.nextUrl;
  if (!request.cookies.has(SESSION_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname.startsWith("/dashboard") ? "" : `?as=customer&next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (isLive()) {
    const access = request.cookies.get(ACCESS_COOKIE)?.value;
    const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
    if (refresh && secondsLeft(access) <= REFRESH_BEFORE_SEC) {
      const r = await refreshTokens(refresh);
      if (r.ok) {
        // The page rendering in this request must already see the new token
        request.cookies.set(ACCESS_COOKIE, r.accessToken);
        request.cookies.set(REFRESH_COOKIE, r.refreshToken);
        const res = NextResponse.next({ request: { headers: request.headers } });
        res.cookies.set(ACCESS_COOKIE, r.accessToken, tokenCookie);
        res.cookies.set(REFRESH_COOKIE, r.refreshToken, tokenCookie);
        return res;
      }
      if (!r.retryable) return NextResponse.redirect(new URL("/logout", request.url));
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/my/:path*", "/session/:path*"] };
