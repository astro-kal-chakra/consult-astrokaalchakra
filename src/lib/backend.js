import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SaasError } from "@/lib/data/saas";
import { ACCESS_COOKIE, BACKEND, isLive } from "@/lib/auth/tokens";

/**
 * Connection to AstroBackend-pg. Set SAAS_BACKEND_URL (e.g. http://localhost:5056/api/v1) to use the real backend
 * ("live"); without it the site runs on the in-memory demo data. The browser never talks to the backend directly:
 * the access / refresh tokens live in httpOnly cookies and every call goes through this server.
 */
export { BACKEND, isLive };

/**
 * Calls the backend and returns `data`, or throws SaasError(message, code). `token`: defaults to the signed-in
 * user's access token cookie. `form`: FormData (file uploads).
 */
export async function api(path, { method = "GET", body, form, token, auth = true, timeoutMs = 15000 } = {}) {
  if (!isLive()) throw new SaasError("The live backend is not configured", "NOT_CONFIGURED");
  const headers = { accept: "application/json", "x-app-platform": "web", "x-app-version": "99.0.0" };
  const at = token ?? (auth ? (await cookies()).get(ACCESS_COOKIE)?.value : null);
  if (at) headers.authorization = `Bearer ${at}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers["content-type"] = "application/json";
    payload = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(`${BACKEND}${path}`, { method, headers, body: payload, cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    throw new SaasError("Can't reach the server right now. Please try again in a moment.", "UNREACHABLE");
  }
  const json = await res.json().catch(() => null);
  if (!json) throw new SaasError("The server sent an unexpected reply. Please try again.", "BAD_REPLY");
  if (!res.ok || json.success === false) {
    const code = json.error?.code || "ERROR";
    if (res.status === 401) {
      // The signed-in user's session is over (expired, revoked, signed in on another device, idle timeout…):
      // clear it and go to the login page instead of failing the page. Calls without the user's token (login,
      // OTP) keep their own error.
      if (at && !token) redirect("/logout");
      throw new SaasError(json.error?.message || "Your session ended. Please sign in again.", "SIGNED_OUT");
    }
    throw new SaasError(json.error?.message || "Something went wrong", code);
  }
  return json.data;
}
