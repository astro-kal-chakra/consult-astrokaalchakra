import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { customerById, demoById } from "@/lib/data/demo-accounts";
import { ACCESS_COOKIE, REFRESH_COOKIE, isLive, tokenCookie } from "./tokens";

/**
 * Session: an httpOnly cookie holding { id, role, exp } signed with HMAC-SHA256 (SAAS_SESSION_SECRET).
 * role: "astrologer" (dashboard) or "customer" (personal pages, bookings, sessions).
 * The proxy only checks that the cookie exists; every page / action verifies the signature here.
 * Live backend (SAAS_BACKEND_URL): `id` is the backend account id and the backend's own access / refresh tokens
 * sit in their own httpOnly cookies (lib/auth/tokens.js); the backend checks those on every call.
 */
export const SESSION_COOKIE = "kc_consult_session";
const MAX_AGE = 7 * 24 * 3600; // 7 days

const secret = () => {
  const s = process.env.SAAS_SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SAAS_SESSION_SECRET is missing or too short");
  return s;
};
const sign = (payload) => crypto.createHmac("sha256", secret()).update(payload).digest("base64url");

/** Demo numbers + fixed OTP: only on the demo data (never with the live backend, never in production). */
export const devLoginEnabled = () => process.env.SAAS_DEV_LOGIN === "true" && process.env.NODE_ENV !== "production" && !isLive();

export async function createSession(accountId, role = "astrologer", tokens = null) {
  const payload = Buffer.from(JSON.stringify({ id: accountId, role, exp: Date.now() + MAX_AGE * 1000 })).toString("base64url");
  const jar = await cookies();
  jar.set(SESSION_COOKIE, `${payload}.${sign(payload)}`, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE });
  if (tokens) {
    jar.set(ACCESS_COOKIE, tokens.accessToken, tokenCookie);
    jar.set(REFRESH_COOKIE, tokens.refreshToken, tokenCookie);
  }
}

export async function destroySession() {
  const jar = await cookies();
  [SESSION_COOKIE, ACCESS_COOKIE, REFRESH_COOKIE].forEach((c) => jar.delete(c));
}

/** The signed-in account { id, role }, or null. */
export async function getSession() {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw || !raw.includes(".")) return null;
  const [payload, mac] = raw.split(".");
  const expected = sign(payload);
  if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  try {
    const { id, role = "astrologer", exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!id || exp < Date.now()) return null;
    if (isLive()) {
      // Live: the backend tokens must be there too (the backend checks them on every call)
      const jar = await cookies();
      if (!jar.get(REFRESH_COOKIE)?.value && !jar.get(ACCESS_COOKIE)?.value) return null;
      return ["astrologer", "customer"].includes(role) ? { id, role } : null;
    }
    // Demo store only knows the demo accounts
    if (role === "astrologer" ? !demoById(id) : role === "customer" ? !customerById(id) : true) return null;
    return { id, role };
  } catch {
    return null;
  }
}

/** For pages and actions that need a signed-in astrologer. */
export async function requireSession() {
  const s = await getSession();
  // An invalid / expired cookie goes through /logout first, so it is cleared (no /login ↔ /dashboard loop)
  if (!s) redirect("/logout");
  return s;
}
