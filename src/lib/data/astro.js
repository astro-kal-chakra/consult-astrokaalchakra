import "server-only";
import { api, isLive } from "@/lib/backend";
import * as demo from "./saas";
import * as billing from "./saas-billing";
import * as demoSessions from "./saas-sessions";
import * as demoSupport from "./support";
import { startBookingSession as demoStartBooking } from "./customer";

/**
 * Astrologer dashboard data: the real backend when SAAS_BACKEND_URL is set, otherwise the demo store.
 * Same function names and return shapes either way, always async. In live mode `id` is ignored: the backend
 * takes the astrologer from the signed-in token.
 */
export { isLive };

const live = isLive;

export const getAccount = async (id) => (live() ? api("/saas/astro/account") : demo.getAccount(id));
export const getEligibility = async (id) => (live() ? api("/saas/astro/eligibility") : demo.getEligibility(id));
export const getUsage = async (id) => (live() ? api("/saas/astro/usage") : demo.getUsage(id));
export const setPresence = async (id, presence) => (live() ? (await api("/saas/astro/presence", { method: "PUT", body: { presence } })).presence : demo.setPresence(id, presence));
export const setPersonalEnabled = async (id, enabled) => (live() ? api("/saas/astro/personal", { method: "PUT", body: { enabled: Boolean(enabled) } }) : demo.setPersonalEnabled(id, enabled));

export async function getProfile(id) {
  if (!live()) return demo.getProfile(id);
  const p = await api("/saas/astro/profile");
  return { profile: p.profile, approval: p.approval, slug: p.slug };
}
export const updateProfile = async (id, patch, { submit = false } = {}) =>
  live() ? api("/saas/astro/profile", { method: "PUT", body: { ...patch, submit } }) : demo.updateProfile(id, patch, { submit });

/** `photo`: { data: Buffer, type } (already checked by the action). */
export async function setProfilePhoto(id, photo) {
  if (!live()) return demo.setProfilePhoto(id, photo);
  const form = new FormData();
  form.append("photo", new Blob([photo.data], { type: photo.type }), `photo.${photo.type.split("/")[1]}`);
  return api("/saas/astro/profile/photo", { method: "POST", form });
}
export const removeProfilePhoto = async (id) => (live() ? api("/saas/astro/profile/photo", { method: "DELETE" }) : demo.removeProfilePhoto(id));

export const getServices = async (id) => (live() ? api("/saas/astro/services") : demo.getServices(id));
export const updateServices = async (id, patch) => (live() ? api("/saas/astro/services", { method: "PUT", body: patch }) : demo.updateServices(id, patch));
export const getAvailability = async (id) => (live() ? api("/saas/astro/availability") : demo.getAvailability(id));
export const updateAvailability = async (id, next) => (live() ? api("/saas/astro/availability", { method: "PUT", body: next }) : demo.updateAvailability(id, next));
export const getSettings = async (id) => (live() ? api("/saas/astro/settings") : demo.getSettings(id));
export const updateSettings = async (id, patch) => (live() ? api("/saas/astro/settings", { method: "PUT", body: patch }) : demo.updateSettings(id, patch));

export const listPlans = async () => (live() ? api("/saas/astro/plans") : demo.listPlans());
export const getSubscription = async (id) => (live() ? api("/saas/astro/subscription") : demo.getSubscription(id));
export const nextPeriodStart = async (id) => (live() ? api("/saas/astro/subscription/next-start") : billing.nextPeriodStart(id));

/**
 * Buying a plan. Live: step 1 creates the Razorpay order (checkout opens in the browser), step 2 confirms it on
 * the server. Demo: bought at once.
 */
export async function startPurchase(id, planId) {
  if (!live()) return { demo: true, ...demo.purchasePlan(id, planId) };
  return api("/saas/astro/subscription/orders", { method: "POST", body: { planId } });
}
export const confirmPurchase = async (_id, { orderId, razorpayPaymentId, signature }) =>
  api("/saas/astro/subscription/confirm", { method: "POST", body: { orderId, razorpayPaymentId, signature } });

/** Overview numbers (stats, next bookings, waiting requests, recent sessions and feedback). */
export async function getOverview(id) {
  if (!live()) return demo.getOverview(id);
  const o = await api("/saas/astro/overview");
  return { ...o, waiting: o.waiting || [], nextBookings: o.nextBookings || [], recentSessions: o.recentSessions || [], recentFeedback: o.recentFeedback || [] };
}

const enc = encodeURIComponent;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** The backend only takes UUIDs; anything else can't exist, so answer like a missing item. */
const idOrNotFound = (x, what) => {
  if (!UUID.test(String(x))) throw new demo.SaasError(`${what} not found`, "NOT_FOUND");
  return enc(String(x));
};

// ---------- Bookings ----------

/** { upcoming, past, counts }. Live: `upcoming` also holds bookings in progress. */
export const listBookings = async (id) => (live() ? api("/saas/astro/bookings") : demo.listBookings(id));
export const cancelBooking = async (id, bookingId, reason) =>
  live() ? api(`/saas/astro/bookings/${idOrNotFound(bookingId, "Booking")}/cancel`, { method: "POST", body: { reason: reason || undefined } }) : demo.cancelBooking(id, bookingId, reason);
/** Starts a booked session; returns the session ({ id, ... }) for /session/<id>. */
export const startBooking = async (id, bookingId) =>
  live() ? api(`/saas/astro/bookings/${idOrNotFound(bookingId, "Booking")}/start`, { method: "POST" }) : demoStartBooking(id, bookingId);

// ---------- Live consultations ----------

/** { waiting, active, history }: history never includes active sessions (the demo store mixes them). */
export async function listSessions(id) {
  if (live()) {
    const r = await api("/saas/astro/consultations");
    return { waiting: r.waiting || [], active: r.active || [], history: r.history || [] };
  }
  demoSessions.expireWaiting(id);
  const { waiting, history } = demo.listSessions(id);
  return { waiting, active: history.filter((s) => s.status === "active"), history: history.filter((s) => s.status !== "active") };
}
export const acceptSession = async (id, sessionId) =>
  live() ? api(`/saas/astro/consultations/${idOrNotFound(sessionId, "Request")}/accept`, { method: "POST" }) : demoSessions.acceptSession(id, sessionId);
export const declineSession = async (id, sessionId) =>
  live() ? api(`/saas/astro/consultations/${idOrNotFound(sessionId, "Request")}/decline`, { method: "POST" }) : demoSessions.declineSession(id, sessionId);
/** Ends an active session from the dashboard; returns the finished session (`amount` in paise). */
export const endSession = async (id, sessionId) =>
  live() ? api(`/saas/sessions/${idOrNotFound(sessionId, "Consultation")}/end`, { method: "POST" }) : demoSessions.endSession(id, sessionId);

// ---------- Followers & feedback ----------

export const listFollowers = async (id) => (live() ? api("/saas/astro/followers") : demo.listFollowers(id));

/** { items, average, count, distribution }. Live items hidden by an admin are left out, like on the public page. */
export async function listFeedback(id) {
  if (!live()) return demo.listFeedback(id);
  const r = await api("/saas/astro/feedback");
  return { ...r, items: (r.items || []).filter((f) => !f.hidden) };
}
export const replyFeedback = async (id, feedbackId, text) =>
  live() ? api(`/saas/astro/feedback/${idOrNotFound(feedbackId, "Feedback")}/reply`, { method: "PUT", body: { text: String(text ?? "") } }) : demo.replyFeedback(id, feedbackId, text);

// ---------- Earnings & payouts ----------

export const getEarnings = async (id) => (live() ? api("/saas/astro/earnings") : demo.getEarnings(id));
export const payoutBreakdown = async (id, amount) => (live() ? api(`/saas/astro/payouts/preview?amount=${enc(Math.max(1, amount))}`) : demo.payoutBreakdown(id, amount));
export const requestPayout = async (id, amount) => (live() ? api("/saas/astro/payouts", { method: "POST", body: { amount: Math.round(Number(amount)) } }) : demo.requestPayout(id, amount));

// ---------- Kundali ----------

export const listKundali = async (id) => (live() ? api("/saas/astro/kundali") : demo.listKundali(id));
/** Returns the saved kundali (live: the backend answers with the whole list, newest first). */
export async function addKundali(id, input) {
  if (!live()) return demo.addKundali(id, input);
  const body = { name: input.name, gender: input.gender || "", dob: input.dob, tob: input.tob || null, place: input.place, region: input.region || null, lat: input.lat ?? null, lng: input.lng ?? null, tz: input.tz || null };
  const list = await api("/saas/astro/kundali", { method: "POST", body });
  return list[0] || { name: input.name };
}
export const removeKundali = async (id, kundaliId) => (live() ? api(`/saas/astro/kundali/${encodeURIComponent(kundaliId)}`, { method: "DELETE" }) : demo.removeKundali(id, kundaliId));

// ---------- Support ----------

/** { categories: { key: label }, limits: { subject, message, maxOpen } } */
export const getSupportMeta = async () => (live() ? api("/saas/astro/support/meta") : { categories: demoSupport.SUPPORT_CATEGORIES, limits: demoSupport.SUPPORT_LIMITS });
export const listMyTickets = async (id) => (live() ? api("/saas/astro/support") : demoSupport.listMyTickets(id));
export const getMyTicket = async (id, ticketId) => (live() ? api(`/saas/astro/support/${idOrNotFound(ticketId, "Ticket")}`) : demoSupport.getMyTicket(id, ticketId));
export const createTicket = async (id, v) => (live() ? api("/saas/astro/support", { method: "POST", body: v }) : demoSupport.createTicket(id, v));
export const replyTicket = async (id, ticketId, message) =>
  live() ? api(`/saas/astro/support/${idOrNotFound(ticketId, "Ticket")}/reply`, { method: "POST", body: { message } }) : demoSupport.replyAsAstrologer(id, ticketId, message);
export const closeTicket = async (id, ticketId) =>
  live() ? api(`/saas/astro/support/${idOrNotFound(ticketId, "Ticket")}/close`, { method: "POST" }) : demoSupport.closeMyTicket(id, ticketId);
