/**
 * Backend tokens of the signed-in user (live mode). No other imports, so the proxy can use this file too.
 * SAAS_BACKEND_URL set = live backend; empty = demo data.
 */
export const BACKEND = (process.env.SAAS_BACKEND_URL || "").replace(/\/$/, "");
export const isLive = () => Boolean(BACKEND);

export const ACCESS_COOKIE = "kc_consult_at";
export const REFRESH_COOKIE = "kc_consult_rt";
export const TOKEN_MAX_AGE = 30 * 24 * 3600; // refresh token lifetime cap; the backend decides the real expiry

export const tokenCookie = { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: TOKEN_MAX_AGE };

/** Seconds until a JWT expires (0 when unreadable / expired). */
export function secondsLeft(jwt) {
  try {
    const { exp } = JSON.parse(Buffer.from(String(jwt).split(".")[1], "base64url").toString());
    return Number.isFinite(exp) ? Math.max(0, exp - Math.floor(Date.now() / 1000)) : 0;
  } catch {
    return 0;
  }
}

// Refresh tokens rotate on every use and a reused one signs the whole session out, so parallel refreshes of the
// same token share one request (same approach as the main dashboard).
const recent = new Map();
export function refreshTokens(refreshToken) {
  let p = recent.get(refreshToken);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(`${BACKEND}/auth/refresh`, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json", "x-app-platform": "web", "x-app-version": "99.0.0" },
          body: JSON.stringify({ refreshToken }),
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.data?.accessToken) return { ok: true, accessToken: json.data.accessToken, refreshToken: json.data.refreshToken };
        return { ok: false, retryable: res.status >= 500 };
      } catch {
        return { ok: false, retryable: true };
      }
    })();
    recent.set(refreshToken, p);
    p.finally(() => setTimeout(() => recent.delete(refreshToken), 60_000));
  }
  return p;
}
