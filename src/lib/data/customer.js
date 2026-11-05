import "server-only";
import { store, makeId, TIME } from "./store";
import { SaasError, assertQuota, getEligibility, getUsage, listFeedback } from "./saas";

/**
 * Customer side of the personal-consultation product (public pages, bookings, talk-now, sessions, feedback).
 * DEMO: in-memory store. REAL: AstroBackend-pg SaaS API + the EXISTING customer account and wallet.
 * Every rule here is enforced by the backend too; the browser never decides prices, slots or money.
 */

const IST = 330 * 60000;
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const LEAD_MS = 30 * TIME.MIN; // earliest bookable slot: 30 min from now
const START_STEP_MS = 15 * TIME.MIN; // start times are offered every 15 minutes
/** Every session keeps a 10-minute gap before and after it (fixed rule, not an astrologer setting). */
export const SESSION_GAP_MINUTES = 10;

/** Session lengths a customer can choose when booking. */
export const DURATIONS = [5, 10, 20, 30, 60];

/** Lengths this astrologer offers: up to their own "longest session" setting AND their plan's limit per session. */
function durationsFor(a) {
  const max = Math.min(a.services.slotMinutes || 60, getUsage(a.account.id).maxSessionMinutes || 0);
  return DURATIONS.filter((d) => d <= max);
}
const TALK_NOW_MIN_MINUTES = 5; // talk-now needs balance for at least 5 minutes
const MODE_LABEL = { chat: "Chat", audio: "Voice call", video: "Video call" };

const customer = (cid) => {
  const c = store.customers[cid];
  if (!c) throw new SaasError("Customer account not found", "NOT_FOUND");
  return c;
};
const accountBySlug = (slug) => Object.values(store.accounts).find((a) => a.account.slug === slug) || null;
const astroIdOf = (a) => a.account.id;

// ---------- Public personal page ----------

/** Everything a visitor sees on consult.astrokaalchakra.com/<slug>. `available`: can book / consult now. */
export function getPublicPage(slug, cid = null) {
  const a = accountBySlug(slug);
  if (!a || !a.account.verified) return null; // unknown or unverified: 404
  const el = getEligibility(astroIdOf(a));
  const sub = el.subscription;
  // Never-approved / never-subscribed astrologers have no public page at all
  if (a.account.profileApproval.status !== "approved" && a.account.profileApproval.status !== "pending") return null;
  if (sub.status === "none") return null;
  const fb = listFeedback(astroIdOf(a));
  const usage = getUsage(astroIdOf(a));
  const services = Object.fromEntries(
    ["chat", "audio", "video"].map((m) => [m, { enabled: a.services[m].enabled, price: a.services[m].price, available: Boolean(el.modes[m]), limitReached: Boolean(usage.modes[m]?.full) }]),
  );
  return {
    slug,
    available: el.canConsult,
    unavailableReason: el.canConsult ? null : sub.status === "expired" ? "This astrologer isn't taking personal consultations right now." : "This personal page isn't live yet.",
    presence: el.canConsult ? a.account.presence : "offline",
    profile: { ...a.profile },
    services,
    talkNow: el.canConsult && a.services.talkNow && a.account.presence === "online",
    durations: durationsFor(a),
    maxSessionMinutes: usage.maxSessionMinutes,
    rating: { average: fb.average, count: fb.count, distribution: fb.distribution },
    reviews: fb.items.filter((f) => f.kind === "review" && !f.hidden).slice(0, 10).map((f) => ({ id: f.id, name: f.customer.name.split(" ")[0], rating: f.rating, text: f.text, at: f.createdAt, reply: f.reply })),
    followers: a.followers.length,
    following: cid ? a.followers.some((f) => f.customerId === cid) : false,
  };
}

// ---------- Slots (from the astrologer's weekly hours, in IST) ----------

const istDate = (ms) => new Date(ms + IST).toISOString().slice(0, 10);
const istToUtc = (date, hhmm) => {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mm] = hhmm.split(":").map(Number);
  return Date.UTC(y, m - 1, d, h, mm) - IST;
};

/**
 * Available start times for a session of `minutes` over the next `bookingWindowDays` days:
 * [{ date, slots: [iso] }]. A time is offered only if the whole session fits in the astrologer's hours
 * and doesn't overlap another booking (plus the astrologer's break between bookings).
 */
export function getSlots(slug, minutes) {
  const a = accountBySlug(slug);
  if (!a || !getEligibility(astroIdOf(a)).canConsult) return [];
  if (!durationsFor(a).includes(minutes)) return [];
  const { weekly, daysOff, bookingWindowDays } = a.availability;
  const len = minutes * TIME.MIN;
  const step = START_STEP_MS;
  const now = Date.now();
  const gap = SESSION_GAP_MINUTES * TIME.MIN;
  // Each booked session blocks its own time plus 10 minutes before and after it
  const busy = a.bookings.filter((b) => b.status === "upcoming").map((b) => [new Date(b.scheduledAt).getTime() - gap, new Date(b.scheduledAt).getTime() + b.durationMinutes * TIME.MIN + gap]);
  const days = [];
  for (let i = 0; i < bookingWindowDays; i++) {
    const date = istDate(now + i * TIME.DAY);
    if (daysOff.includes(date)) continue;
    const [y, m, d] = date.split("-").map(Number);
    const ranges = weekly[DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]] || [];
    const slots = [];
    for (const r of ranges) {
      const end = istToUtc(date, r.to);
      for (let t = istToUtc(date, r.from); t + len <= end; t += step) {
        if (t < now + LEAD_MS) continue;
        // Taken by another booking (or its 10-minute gap): still shown, but marked booked and not selectable
        const booked = busy.some(([s, e]) => t < e && t + len > s);
        slots.push({ at: new Date(t).toISOString(), booked });
      }
    }
    if (slots.length) days.push({ date, slots, available: slots.filter((x) => !x.booked).length });
  }
  return days;
}

// ---------- Follow (personal page followers only) ----------

export function toggleFollow(cid, slug) {
  const c = customer(cid);
  const a = accountBySlug(slug);
  if (!a) throw new SaasError("Astrologer not found", "NOT_FOUND");
  const i = a.followers.findIndex((f) => f.customerId === cid);
  if (i >= 0) {
    a.followers.splice(i, 1);
    return { following: false, followers: a.followers.length };
  }
  a.followers.unshift({ id: makeId("fol"), customerId: cid, name: c.name, city: c.city, followedAt: new Date().toISOString() });
  return { following: true, followers: a.followers.length };
}

export function listFollowing(cid) {
  return Object.values(store.accounts)
    .filter((a) => a.followers.some((f) => f.customerId === cid))
    .map((a) => ({ slug: a.account.slug, name: a.profile.displayName, photoUrl: a.profile.photoUrl || null, headline: a.profile.headline, available: getEligibility(astroIdOf(a)).canConsult, presence: a.account.presence, followedAt: a.followers.find((f) => f.customerId === cid).followedAt }));
}

// ---------- Wallet (the SAME wallet as the marketplace; demo copy here) ----------

export function getWallet(cid) {
  const c = customer(cid);
  return { balance: c.wallet.balance, transactions: [...c.transactions].sort((x, y) => new Date(y.at) - new Date(x.at)) };
}

/** Per-minute charge for a finished session. Never more than the balance (the real session ends at 0). */
export function chargeSession(cid, session) {
  const c = store.customers[cid];
  if (!c) return 0;
  const amount = Math.min(session.amount, c.wallet.balance);
  c.wallet.balance -= amount;
  c.transactions.push({ id: makeId("txn"), type: "debit", amount, label: `Personal consultation · ${MODE_LABEL[session.mode]}`, ref: session.code, at: session.endedAt || new Date().toISOString() });
  return amount;
}

// ---------- Bookings (nothing charged at booking; balance only checked) ----------

const forCustomer = (cid) =>
  Object.values(store.accounts).flatMap((a) =>
    a.bookings
      .filter((b) => b.customer?.id === cid)
      .map((b) => {
        const session = a.sessions.find((s) => s.bookingId === b.id) || null;
        const t = new Date(b.scheduledAt).getTime();
        return {
          ...b,
          astrologer: { slug: a.account.slug, name: a.profile.displayName },
          session: session ? { id: session.id, status: session.status, amount: session.amount, durationSec: session.durationSec } : null,
          canCancel: b.status === "upcoming" && t - Date.now() > TIME.HOUR,
          canJoin: Boolean(session && session.status === "active"),
          feedbackGiven: a.feedback.some((f) => f.bookingId === b.id || (session && f.sessionId === session.id)),
        };
      }),
  );

export function listMyBookings(cid) {
  const all = forCustomer(cid);
  return {
    upcoming: all.filter((b) => b.status === "upcoming").sort((x, y) => new Date(x.scheduledAt) - new Date(y.scheduledAt)),
    past: all.filter((b) => b.status !== "upcoming").sort((x, y) => new Date(y.scheduledAt) - new Date(x.scheduledAt)),
  };
}

/** Available times for every length the astrologer offers: { 5: [...days], 10: [...], ... }. */
export function getSlotsByDuration(slug) {
  const a = accountBySlug(slug);
  if (!a) return {};
  return Object.fromEntries(durationsFor(a).map((d) => [d, getSlots(slug, d)]));
}

export function createBooking(cid, slug, { mode, startsAt, minutes: chosen, concern }) {
  const c = customer(cid);
  const a = accountBySlug(slug);
  if (!a) throw new SaasError("Astrologer not found", "NOT_FOUND");
  const aid = astroIdOf(a);
  const el = getEligibility(aid);
  if (!el.canConsult) throw new SaasError("This astrologer isn't taking personal consultations right now", "UNAVAILABLE");
  if (!["chat", "audio", "video"].includes(mode) || !a.services[mode].enabled) throw new SaasError("This consultation type isn't offered", "BAD_MODE");
  assertQuota(aid, mode); // plan limit (shown to the customer as "not available")
  const minutes = Number(chosen);
  if (!durationsFor(a).includes(minutes)) throw new SaasError("Choose one of the session lengths offered", "BAD_LENGTH");
  const slot = getSlots(slug, minutes)
    .flatMap((d) => d.slots)
    .find((x) => x.at === startsAt);
  if (!slot) throw new SaasError("That time is no longer available. Please pick another time.", "SLOT_TAKEN");
  if (slot.booked) throw new SaasError("This time was just booked by someone else. Please choose another time.", "SLOT_TAKEN");
  const rate = a.services[mode].price;
  if (c.wallet.balance < rate * minutes) throw new SaasError(`Your wallet needs at least ₹${(rate * minutes) / 100} for this ${minutes}-minute session. Nothing is charged now. Please recharge first.`, "LOW_BALANCE");
  const b = {
    id: makeId("bk"),
    customer: { id: cid, name: c.name, city: c.city },
    mode,
    scheduledAt: startsAt,
    durationMinutes: minutes,
    ratePerMin: rate,
    status: "upcoming",
    amountCharged: 0,
    concern: String(concern || "").trim().slice(0, 300) || null,
    createdAt: new Date().toISOString(),
  };
  b.code = `BK-${b.id.split("-")[1]}`;
  a.bookings.push(b);
  return b;
}

export function cancelMyBooking(cid, bookingId) {
  for (const a of Object.values(store.accounts)) {
    const b = a.bookings.find((x) => x.id === bookingId && x.customer?.id === cid);
    if (!b) continue;
    if (b.status !== "upcoming") throw new SaasError("Only upcoming bookings can be cancelled", "NOT_UPCOMING");
    if (new Date(b.scheduledAt).getTime() - Date.now() <= TIME.HOUR) throw new SaasError("Bookings can only be cancelled more than 1 hour before the start time", "TOO_LATE");
    Object.assign(b, { status: "cancelled_by_customer", cancelledAt: new Date().toISOString() });
    return b;
  }
  throw new SaasError("Booking not found", "NOT_FOUND");
}

// ---------- Talk now (astrologer has 2 minutes to accept) ----------

export function requestTalkNow(cid, slug, mode) {
  const c = customer(cid);
  const a = accountBySlug(slug);
  if (!a) throw new SaasError("Astrologer not found", "NOT_FOUND");
  const aid = astroIdOf(a);
  const el = getEligibility(aid);
  if (!el.canConsult || !a.services.talkNow || a.account.presence !== "online") throw new SaasError("The astrologer isn't available to talk right now. You can book a time instead.", "UNAVAILABLE");
  if (!a.services[mode]?.enabled) throw new SaasError("This consultation type isn't offered", "BAD_MODE");
  assertQuota(aid, mode);
  const rate = a.services[mode].price;
  if (c.wallet.balance < rate * TALK_NOW_MIN_MINUTES) throw new SaasError(`You need at least ₹${(rate * TALK_NOW_MIN_MINUTES) / 100} (5 minutes) in your wallet to start. Please recharge first.`, "LOW_BALANCE");
  if (a.sessions.some((s) => s.customer?.id === cid && (s.status === "waiting" || s.status === "active"))) throw new SaasError("You already have a request or session with this astrologer", "EXISTS");
  const now = Date.now();
  const s = { id: makeId("ses"), bookingId: null, type: "talk_now", customer: { id: cid, name: c.name, city: c.city }, mode, startedAt: null, endedAt: null, durationSec: 0, ratePerMin: rate, amount: 0, status: "waiting", requestedAt: new Date(now).toISOString(), expiresAt: new Date(now + 2 * TIME.MIN).toISOString(), messages: [] };
  s.code = `PS-${s.id.split("-")[1]}`;
  a.sessions.unshift(s);
  return { id: s.id };
}

// ---------- Session room (chat; voice / video connect with Agora later) ----------

function findSession(sid) {
  for (const a of Object.values(store.accounts)) {
    const s = a.sessions.find((x) => x.id === sid);
    if (s) return { a, s };
  }
  return null;
}

/** The room as `who` sees it. Only the session's own customer or astrologer can open it. */
export function getRoom(sid, who) {
  const f = findSession(sid);
  if (!f) throw new SaasError("Session not found", "NOT_FOUND");
  const { a, s } = f;
  // A waiting request whose 2 minutes ran out is missed (the real backend does this with a job)
  if (s.status === "waiting" && new Date(s.expiresAt).getTime() <= Date.now()) Object.assign(s, { status: "missed", expiredAt: s.expiresAt });
  const allowed = who.role === "customer" ? s.customer?.id === who.id : astroIdOf(a) === who.id;
  if (!allowed) throw new SaasError("Session not found", "NOT_FOUND");
  return {
    id: s.id,
    code: s.code,
    status: s.status,
    mode: s.mode,
    type: s.type,
    ratePerMin: s.ratePerMin,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    expiresAt: s.expiresAt || null,
    maxMinutes: s.maxMinutes || null,
    durationSec: s.durationSec,
    amount: s.amount,
    customer: { name: s.customer?.name },
    astrologer: { name: a.profile.displayName, slug: a.account.slug },
    messages: (s.messages || []).map((m) => ({ ...m, mine: m.from === who.role })),
    feedbackGiven: a.feedback.some((x) => x.sessionId === s.id),
  };
}

export function sendMessage(sid, who, text) {
  const f = findSession(sid);
  if (!f) throw new SaasError("Session not found", "NOT_FOUND");
  const { a, s } = f;
  const allowed = who.role === "customer" ? s.customer?.id === who.id : astroIdOf(a) === who.id;
  if (!allowed) throw new SaasError("Session not found", "NOT_FOUND");
  if (s.status !== "active") throw new SaasError("The session isn't in progress", "NOT_ACTIVE");
  const clean = String(text || "").trim().slice(0, 2000);
  if (!clean) throw new SaasError("Type a message", "EMPTY");
  s.messages = s.messages || [];
  const m = { id: makeId("msg"), from: who.role, text: clean, at: new Date().toISOString() };
  s.messages.push(m);
  return m;
}

/** Ends an active session (either side). Charges the customer per minute (capped at the plan's max length). */
export function finishSession(sid, who) {
  const f = findSession(sid);
  if (!f) throw new SaasError("Session not found", "NOT_FOUND");
  const { a, s } = f;
  const allowed = who.role === "customer" ? s.customer?.id === who.id : astroIdOf(a) === who.id;
  if (!allowed) throw new SaasError("Session not found", "NOT_FOUND");
  if (s.status === "waiting" && who.role === "customer") {
    Object.assign(s, { status: "cancelled_by_customer", endedAt: new Date().toISOString() });
    return s;
  }
  if (s.status !== "active") throw new SaasError("The session isn't in progress", "NOT_ACTIVE");
  const end = Date.now();
  const durationSec = Math.min(Math.max(1, Math.round((end - new Date(s.startedAt).getTime()) / 1000)), (s.maxMinutes || 60) * 60);
  const amount = Math.round((s.ratePerMin * durationSec) / 60);
  Object.assign(s, { status: "completed", endedAt: new Date(end).toISOString(), durationSec, amount });
  const charged = s.customer?.id ? chargeSession(s.customer.id, s) : amount;
  s.amount = charged;
  a.ledger.push({ id: makeId("led"), type: "credit", category: "session", amount: charged, description: `${MODE_LABEL[s.mode]} consultation · ${s.customer?.name || "Customer"}`, ref: s.code, createdAt: s.endedAt });
  if (s.bookingId) {
    const b = a.bookings.find((x) => x.id === s.bookingId);
    if (b) Object.assign(b, { status: "completed", amountCharged: charged });
  }
  return s;
}

/** Astrologer starts a scheduled booking (from 10 min before to 2 min after the start time). */
export function startBookingSession(aid, bookingId) {
  const a = store.accounts[aid];
  const b = a?.bookings.find((x) => x.id === bookingId);
  if (!b) throw new SaasError("Booking not found", "NOT_FOUND");
  if (b.status !== "upcoming") throw new SaasError("This booking isn't upcoming", "NOT_UPCOMING");
  const t = new Date(b.scheduledAt).getTime();
  const now = Date.now();
  if (now < t - 10 * TIME.MIN) throw new SaasError("You can start the session from 10 minutes before the booked time", "TOO_EARLY");
  if (now > t + 2 * TIME.MIN) {
    Object.assign(b, { status: "missed" });
    throw new SaasError("More than 2 minutes have passed, so the booking expired (the customer isn't charged)", "MISSED");
  }
  if (!getEligibility(aid).canConsult) throw new SaasError("Your personal service is offline", "NOT_ELIGIBLE");
  if (a.sessions.some((x) => x.status === "active")) throw new SaasError("Finish your current consultation first", "BUSY");
  const max = getUsage(aid).maxSessionMinutes;
  const s = { id: makeId("ses"), bookingId: b.id, type: "scheduled", customer: b.customer, mode: b.mode, startedAt: new Date(now).toISOString(), endedAt: null, durationSec: 0, ratePerMin: b.ratePerMin, amount: 0, status: "active", maxMinutes: max, autoEndAt: new Date(now + max * TIME.MIN).toISOString(), messages: [] };
  s.code = `PS-${s.id.split("-")[1]}`;
  a.sessions.unshift(s);
  return s;
}

// ---------- Feedback (SaaS only; never on the marketplace) ----------

/** After a completed session (rating 1–5) or a missed booking (no rating). Once per session / booking. */
export function addFeedback(cid, { sessionId, bookingId, rating, text }) {
  for (const a of Object.values(store.accounts)) {
    const s = sessionId ? a.sessions.find((x) => x.id === sessionId && x.customer?.id === cid) : null;
    const b = bookingId ? a.bookings.find((x) => x.id === bookingId && x.customer?.id === cid) : null;
    if (!s && !b) continue;
    const clean = String(text || "").trim().slice(0, 500);
    if (s) {
      if (s.status !== "completed") throw new SaasError("You can review a session after it ends", "NOT_COMPLETED");
      if (a.feedback.some((f) => f.sessionId === s.id)) throw new SaasError("You already reviewed this session", "DUPLICATE");
      const r = Number(rating);
      if (!Number.isInteger(r) || r < 1 || r > 5) throw new SaasError("Choose 1 to 5 stars", "BAD_RATING");
      const f = { id: makeId("fb"), kind: "review", rating: r, text: clean, customer: { id: cid, name: s.customer.name }, sessionId: s.id, sessionCode: s.code, mode: s.mode, createdAt: new Date().toISOString(), reply: null };
      a.feedback.push(f);
      return f;
    }
    if (b.status !== "missed") throw new SaasError("Feedback without a rating is only for missed sessions", "NOT_MISSED");
    if (a.feedback.some((f) => f.bookingId === b.id)) throw new SaasError("You already sent feedback for this booking", "DUPLICATE");
    if (!clean) throw new SaasError("Tell us what happened", "EMPTY");
    const f = { id: makeId("fb"), kind: "missed_session", rating: null, text: clean, customer: { id: cid, name: b.customer.name }, bookingId: b.id, sessionCode: b.code, mode: b.mode, createdAt: new Date().toISOString(), reply: null };
    a.feedback.push(f);
    return f;
  }
  throw new SaasError("Session not found", "NOT_FOUND");
}

/** Talk-now requests / active sessions of this customer (for "waiting" and "in progress" banners). */
export function myLiveSessions(cid) {
  return Object.values(store.accounts).flatMap((a) =>
    a.sessions
      .filter((s) => s.customer?.id === cid && (s.status === "waiting" || s.status === "active"))
      .map((s) => ({ id: s.id, status: s.status, mode: s.mode, astrologer: a.profile.displayName, expiresAt: s.expiresAt || null })),
  );
}

// ---------- Directory (customer home) ----------

/**
 * Astrologers whose personal page is LIVE (all go-live conditions true), for the customer home.
 * Filters: q (name / expertise / language), mode (chat | audio | video), online ("1").
 */
export function listPublicAstrologers({ q = "", mode = "", online = "" } = {}) {
  const needle = String(q).trim().toLowerCase();
  return Object.values(store.accounts)
    .filter((a) => a.account.verified && getEligibility(a.account.id).canConsult)
    .map((a) => {
      const el = getEligibility(a.account.id);
      const fb = listFeedback(a.account.id);
      const offered = ["chat", "audio", "video"].filter((m) => a.services[m].enabled);
      return {
        slug: a.account.slug,
        name: a.profile.displayName,
        photoUrl: a.profile.photoUrl || null,
        headline: a.profile.headline,
        expertise: a.profile.expertise,
        languages: a.profile.languages,
        experienceYears: a.profile.experienceYears,
        presence: a.account.presence,
        talkNow: a.services.talkNow && a.account.presence === "online",
        rating: fb.average,
        ratingCount: fb.count,
        modes: Object.fromEntries(offered.map((m) => [m, { price: a.services[m].price, available: Boolean(el.modes[m]) }])),
        fromPrice: Math.min(...offered.map((m) => a.services[m].price)),
      };
    })
    .filter((x) => !needle || [x.name, x.headline, ...x.expertise, ...x.languages].some((t) => String(t || "").toLowerCase().includes(needle)))
    .filter((x) => !mode || x.modes[mode]?.available)
    .filter((x) => online !== "1" || x.presence === "online")
    .sort((x, y) => (y.presence === "online") - (x.presence === "online") || (y.rating || 0) - (x.rating || 0));
}

/**
 * "Similar astrologers" for a personal page or the featured astrologer: other LIVE astrologers, most shared
 * expertise and languages first (online ones before offline on a tie).
 */
export function similarAstrologers(slug, limit = 6) {
  const base = accountBySlug(slug);
  if (!base) return [];
  const exp = new Set(base.profile.expertise.map((x) => x.toLowerCase()));
  const lang = new Set(base.profile.languages.map((x) => x.toLowerCase()));
  return listPublicAstrologers()
    .filter((x) => x.slug !== slug)
    .map((x) => ({
      ...x,
      shared: x.expertise.filter((e) => exp.has(e.toLowerCase())),
      score: x.expertise.filter((e) => exp.has(e.toLowerCase())).length * 2 + x.languages.filter((l) => lang.has(l.toLowerCase())).length + (x.presence === "online" ? 0.5 : 0),
    }))
    .sort((p, q) => q.score - p.score)
    .slice(0, limit);
}

/** The astrologer this customer came for: their latest booking, else the latest one they follow. */
export function myAstrologerSlug(cid) {
  const latestBooking = Object.values(store.accounts)
    .flatMap((a) => a.bookings.filter((b) => b.customer?.id === cid).map((b) => ({ slug: a.account.slug, at: b.createdAt })))
    .sort((x, y) => new Date(y.at) - new Date(x.at))[0];
  if (latestBooking) return latestBooking.slug;
  const follow = Object.values(store.accounts)
    .flatMap((a) => a.followers.filter((f) => f.customerId === cid).map((f) => ({ slug: a.account.slug, at: f.followedAt })))
    .sort((x, y) => new Date(y.at) - new Date(x.at))[0];
  return follow?.slug || null;
}

/** First available time (any length the astrologer offers, shortest first) for a "Next available" line. */
export function nextAvailable(slug) {
  const a = accountBySlug(slug);
  if (!a) return null;
  for (const d of durationsFor(a)) {
    for (const day of getSlots(slug, d)) {
      const s = day.slots.find((x) => !x.booked);
      if (s) return s.at;
    }
  }
  return null;
}

/** One of this customer's bookings, with the astrologer's public info and a status timeline. */
export function getMyBooking(cid, bookingId) {
  const b = forCustomer(cid).find((x) => x.id === bookingId);
  if (!b) throw new SaasError("Booking not found", "NOT_FOUND");
  const a = Object.values(store.accounts).find((x) => x.account.slug === b.astrologer.slug);
  const t = new Date(b.scheduledAt).getTime();
  const done = ["completed"].includes(b.status);
  const ended = !["upcoming"].includes(b.status);
  const steps = [
    { key: "booked", label: "Booked", at: b.createdAt, state: "done", text: "Nothing was charged when booking." },
    { key: "reminders", label: "Reminders", state: ended || Date.now() > t - 10 * TIME.MIN ? "done" : "current", text: "You and the astrologer get reminders 24 h, 1 h and 10 min before." },
    {
      key: "session",
      label: "Session",
      at: b.session?.status === "active" || done ? b.scheduledAt : null,
      state: b.status === "upcoming" ? (b.canJoin ? "current" : "pending") : done ? "done" : "failed",
      text: b.canJoin ? "The astrologer has started. Join now." : b.status === "upcoming" ? "At the booked time the astrologer starts the session and a Join button appears here. If they don't join within 2 minutes, it expires and you aren't charged." : null,
    },
    {
      key: "result",
      label: { completed: "Completed", missed: "Missed", cancelled_by_customer: "Cancelled by you", cancelled_by_astrologer: "Cancelled by astrologer", expired_not_attempted: "Expired (not attempted)" }[b.status] || "Done",
      state: b.status === "upcoming" ? "pending" : done ? "done" : "failed",
      text: done ? "Charged per minute from your wallet." : b.status === "upcoming" ? null : "You weren't charged.",
    },
  ];
  return {
    ...b,
    steps,
    astrologerInfo: a ? { slug: a.account.slug, name: a.profile.displayName, headline: a.profile.headline, expertise: a.profile.expertise, languages: a.profile.languages, presence: getEligibility(a.account.id).canConsult ? a.account.presence : "offline" } : null,
  };
}
