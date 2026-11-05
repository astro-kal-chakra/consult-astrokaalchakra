"use server";

import { getSession } from "@/lib/auth/session";
import { SaasError } from "@/lib/data/saas";
import { addFeedback, callToken, finishSession, getRoom, sendMessage } from "@/lib/data/customer-data";

/**
 * Session-room actions for BOTH roles. Who you are comes only from the signed session cookie; getRoom /
 * sendMessage / finishSession refuse anyone who isn't this session's customer or astrologer.
 * The room refreshes every 2 s (both modes); with the live backend every call goes to AstroBackend-pg.
 */
async function as(fn) {
  const s = await getSession();
  if (!s) return { ok: false, error: { message: "Please sign in again", code: "SIGNED_OUT" } };
  try {
    const data = await fn({ id: s.id, role: s.role });
    return { ok: true, data: JSON.parse(JSON.stringify(data ?? null)) };
  } catch (err) {
    if (err instanceof SaasError) return { ok: false, error: { message: err.message, code: err.code } };
    throw err;
  }
}

export async function refreshRoom(sessionId) {
  return as((who) => getRoom(String(sessionId), who));
}

export async function sendRoomMessage(sessionId, text) {
  return as(async (who) => {
    await sendMessage(String(sessionId), who, String(text || ""), `w${Date.now()}${Math.random().toString(36).slice(2, 8)}`);
    return getRoom(String(sessionId), who);
  });
}

/** Ends an active session (either side) or, for the customer, cancels a waiting talk-now request. */
export async function endRoom(sessionId) {
  return as(async (who) => {
    await finishSession(String(sessionId), who);
    return getRoom(String(sessionId), who);
  });
}

/** Customer rating after the session (SaaS-only feedback). */
export async function rateRoom(sessionId, rating, text) {
  return as(async (who) => {
    if (who.role !== "customer") throw new SaasError("Only the customer can rate a session", "FORBIDDEN");
    await addFeedback(who.id, { sessionId: String(sessionId), rating: Number(rating), text: String(text || "").slice(0, 500) || undefined });
    return getRoom(String(sessionId), who);
  });
}

/** Voice / video: the Agora token for this session (live backend only; only its two people, only while active). */
export async function roomCallToken(sessionId) {
  return as(() => callToken(String(sessionId)));
}
