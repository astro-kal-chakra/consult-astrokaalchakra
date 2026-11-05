import "server-only";
import { api, isLive } from "@/lib/backend";
import * as demo from "./customer";

/**
 * Customer side data (personal pages, slots, bookings, talk-now, session room, following, wallet): the real
 * backend when SAAS_BACKEND_URL is set, otherwise the demo store. Same names and shapes, always async.
 * Live: the customer comes from the signed-in token (the `cid` arguments are ignored), and the session room
 * works for whoever is signed in (customer or astrologer).
 */
const live = isLive;
const enc = encodeURIComponent;

export async function getPublicPage(slug, cid = null) {
  if (!live()) return demo.getPublicPage(slug, cid);
  try {
    return await api(cid ? `/saas/me/astrologers/${enc(slug)}` : `/saas/public/astrologers/${enc(slug)}`, { auth: Boolean(cid) });
  } catch (err) {
    if (err.code === "NOT_FOUND" || err.code === "VALIDATION_ERROR") return null;
    throw err;
  }
}

export async function listPublicAstrologers(opts = {}) {
  if (!live()) return demo.listPublicAstrologers(opts);
  const p = new URLSearchParams();
  for (const k of ["q", "mode", "online"]) if (opts[k]) p.set(k, String(opts[k]));
  return api(`/saas/public/astrologers${p.size ? `?${p}` : ""}`, { auth: false });
}

export const similarAstrologers = async (slug, limit = 6) => (live() ? api(`/saas/public/astrologers/${enc(slug)}/similar`, { auth: false }).catch(() => []) : demo.similarAstrologers(slug, limit));
export const nextAvailable = async (slug) => (live() ? (await api(`/saas/public/astrologers/${enc(slug)}/next-available`, { auth: false }).catch(() => ({ at: null }))).at : demo.nextAvailable(slug));

/** { [minutes]: days } for every length the astrologer offers. */
export async function getSlotsByDuration(slug) {
  if (!live()) return demo.getSlotsByDuration(slug);
  const page = await getPublicPage(slug);
  if (!page?.available) return {};
  const entries = await Promise.all(page.durations.map(async (m) => [m, await api(`/saas/public/astrologers/${enc(slug)}/slots?minutes=${m}`, { auth: false }).catch(() => [])]));
  return Object.fromEntries(entries);
}

export const toggleFollow = async (cid, slug) => (live() ? api(`/saas/me/astrologers/${enc(slug)}/follow`, { method: "POST" }) : demo.toggleFollow(cid, slug));
export const listFollowing = async (cid) => (live() ? api("/saas/me/following") : demo.listFollowing(cid));

/** Live: the Astro Kaal Chakra wallet balance (the full passbook is in the app). */
export async function getWallet(cid) {
  if (!live()) return demo.getWallet(cid);
  const w = await api("/saas/me/wallet");
  return { balance: w.balance, reservedForBookings: w.reservedForBookings, available: w.available, transactions: [] };
}

export const listMyBookings = async (cid) => (live() ? api("/saas/me/bookings") : demo.listMyBookings(cid));
export const getMyBooking = async (cid, id) => (live() ? api(`/saas/me/bookings/${enc(id)}`) : demo.getMyBooking(cid, id));
export const createBooking = async (cid, slug, input) =>
  live() ? api("/saas/me/bookings", { method: "POST", body: { slug, mode: input.mode, startsAt: input.startsAt, minutes: Number(input.minutes), concern: input.concern || undefined } }) : demo.createBooking(cid, slug, input);
export const cancelMyBooking = async (cid, id) => (live() ? api(`/saas/me/bookings/${enc(id)}/cancel`, { method: "POST" }) : demo.cancelMyBooking(cid, id));
export const requestTalkNow = async (cid, slug, mode) => (live() ? api("/saas/me/talk-now", { method: "POST", body: { slug, mode } }) : demo.requestTalkNow(cid, slug, mode));
export const myLiveSessions = async (cid) => (live() ? api("/saas/me/live").catch(() => []) : demo.myLiveSessions(cid));
export const addFeedback = async (cid, input) => (live() ? api("/saas/me/feedback", { method: "POST", body: input }) : demo.addFeedback(cid, input));

/** The astrologer to feature on the home page: latest booking, else latest followed. */
export async function myAstrologerSlug(cid) {
  if (!live()) return demo.myAstrologerSlug(cid);
  try {
    const b = await api("/saas/me/bookings");
    const latest = [...b.upcoming, ...b.past].sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt))[0];
    if (latest) return latest.astrologer.slug;
    return (await api("/saas/me/following"))[0]?.slug || null;
  } catch {
    return null;
  }
}

// ---------- Session room (customer or astrologer) ----------

export const getRoom = async (sid, who) => (live() ? api(`/saas/sessions/${enc(sid)}`) : demo.getRoom(sid, who));
export const sendMessage = async (sid, who, text, clientMsgId) =>
  live() ? api(`/saas/sessions/${enc(sid)}/messages`, { method: "POST", body: { text, clientMsgId } }) : demo.sendMessage(sid, who, text);

/** Ends the consultation; for a customer's waiting talk-now request, withdraws it. */
export async function finishSession(sid, who) {
  if (!live()) return demo.finishSession(sid, who);
  const room = await api(`/saas/sessions/${enc(sid)}`);
  if (room.status === "waiting" && who?.role === "customer") return api(`/saas/me/talk-now/${enc(sid)}/cancel`, { method: "POST" });
  return api(`/saas/sessions/${enc(sid)}/end`, { method: "POST" });
}

export const callToken = async (sid) => api(`/saas/sessions/${enc(sid)}/call-token`);
