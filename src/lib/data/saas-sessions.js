import "server-only";
import { store } from "./store";
import { finishSession } from "./customer";
import { SaasError, assertQuota, getEligibility, getUsage } from "./saas";

/**
 * Demo talk-now request handling (accept / decline / end). The real version lives in AstroBackend-pg:
 * the 2-minute expiry is a backend job, and billing is per minute from the customer's wallet during the session.
 */

const sessionsOf = (id) => {
  const a = store.accounts[id];
  if (!a) throw new SaasError("Account not found", "NOT_FOUND");
  return a;
};

/** Waiting requests past their 2-minute window become "missed" (nothing charged). */
export function expireWaiting(id) {
  const a = sessionsOf(id);
  const t = Date.now();
  for (const s of a.sessions) {
    if (s.status === "waiting" && s.expiresAt && new Date(s.expiresAt).getTime() <= t) Object.assign(s, { status: "missed", expiredAt: s.expiresAt });
  }
}

const find = (id, sessionId) => {
  expireWaiting(id);
  const s = sessionsOf(id).sessions.find((x) => x.id === sessionId);
  if (!s) throw new SaasError("Consultation not found", "NOT_FOUND");
  return s;
};

export function acceptSession(id, sessionId) {
  if (!getEligibility(id).canConsult) throw new SaasError("Your personal service is offline. Complete every activation step first.", "NOT_ELIGIBLE");
  const s = find(id, sessionId);
  if (s.status === "missed") throw new SaasError("This request expired after 2 minutes. Nothing was charged.", "EXPIRED");
  if (s.status !== "waiting") throw new SaasError("This request is no longer waiting", "NOT_WAITING");
  const a = sessionsOf(id);
  if (a.sessions.some((x) => x.status === "active")) throw new SaasError("Finish your current consultation first", "BUSY");
  assertQuota(id, s.mode); // plan limit for this type (chat / voice / video)
  // The session ends by itself at the plan's maximum length (the real backend enforces it during the call)
  const max = getUsage(id).maxSessionMinutes;
  Object.assign(s, { status: "active", startedAt: new Date().toISOString(), maxMinutes: max, autoEndAt: new Date(Date.now() + max * 60000).toISOString() });
  return s;
}

export function declineSession(id, sessionId) {
  const s = find(id, sessionId);
  if (s.status !== "waiting") throw new SaasError("This request is no longer waiting", "NOT_WAITING");
  Object.assign(s, { status: "declined", endedAt: new Date().toISOString() });
  return s;
}

/** Ends an active session from the dashboard: same rules as the customer side (charge per minute, capped). */
export function endSession(id, sessionId) {
  find(id, sessionId); // ownership + expiry check
  return finishSession(sessionId, { role: "astrologer", id });
}
