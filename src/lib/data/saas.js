import "server-only";
import { store, makeId, TIME } from "./store";

/**
 * Personal-consultation (SaaS) data service used by every dashboard page and server action.
 *
 * Today it reads / writes the in-memory demo store (dev). When the SaaS API exists in AstroBackend-pg,
 * each function here becomes one request to it; pages and actions stay the same. All rules below are
 * ALSO enforced by the backend later — the UI never decides prices, eligibility or money on its own.
 */

export class SaasError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

const acct = (id) => {
  const a = store.accounts[id];
  if (!a) throw new SaasError("Account not found", "NOT_FOUND");
  return a;
};
const now = () => Date.now();

// ---------- Subscription periods (prepaid, queued; status derived from dates) ----------

function periodStatus(p, t = now()) {
  const s = new Date(p.startsAt).getTime();
  const e = new Date(p.endsAt).getTime();
  return t < s ? "queued" : t >= e ? "expired" : "active";
}

export function getSubscription(id) {
  const a = acct(id);
  const t = now();
  const periods = a.periods.map((p) => ({ ...p, status: periodStatus(p, t) })).sort((x, y) => new Date(x.startsAt) - new Date(y.startsAt));
  const current = periods.find((p) => p.status === "active") || null;
  const queued = periods.filter((p) => p.status === "queued");
  const last = periods[periods.length - 1] || null;
  const paidUntil = last && last.status !== "expired" ? last.endsAt : null;
  const status = current ? "active" : queued.length ? "scheduled" : periods.length ? "expired" : "none";
  return {
    status, // none | active | scheduled (paid, starts later) | expired
    current,
    queued,
    paidUntil,
    daysLeft: current ? Math.max(0, Math.ceil((new Date(current.endsAt).getTime() - t) / TIME.DAY)) : 0,
    totalDaysLeft: paidUntil ? Math.max(0, Math.ceil((new Date(paidUntil).getTime() - t) / TIME.DAY)) : 0,
    periods: [...periods].reverse(),
    purchases: [...a.purchases].sort((x, y) => new Date(y.paidAt) - new Date(x.paidAt)),
  };
}

/** Plans astrologers can buy (admin can switch a plan off). `all`: include switched-off plans (admin). */
export const listPlans = ({ all = false } = {}) =>
  store.plans.filter((p) => all || p.active !== false).map((p) => {
    const gst = Math.round((p.price * p.gstPercent) / 100);
    return { ...p, gst, total: p.price + gst, perMonth: Math.round(p.price / p.months) };
  });

/**
 * Buys a plan. DEMO: the payment is treated as verified. REAL: Razorpay order on the server → checkout →
 * the backend verifies the signature / webhook and only then stores the purchase and period (idempotent).
 * The new period starts when the last paid period ends (no paid days lost), or now if nothing is active.
 */
export function purchasePlan(id, planId) {
  const a = acct(id);
  if (!a.account.verified) throw new SaasError("Only verified astrologers can subscribe", "NOT_VERIFIED");
  const plan = listPlans().find((p) => p.id === planId);
  if (!plan) throw new SaasError("Plan not found", "PLAN_NOT_FOUND");
  const t = now();
  const lastEnd = a.periods.reduce((m, p) => Math.max(m, new Date(p.endsAt).getTime()), 0);
  const start = Math.max(t, lastEnd);
  const end = new Date(start);
  end.setMonth(end.getMonth() + plan.months);
  const purchase = { id: makeId("pur"), planId, planName: plan.name, amount: plan.price, gst: plan.gst, total: plan.total, status: "paid", razorpayPaymentId: `pay_demo${Date.now()}`, paidAt: new Date(t).toISOString() };
  purchase.code = `SUB-${purchase.id.split("-")[1]}`;
  purchase.invoiceNo = `KC/SAAS/${purchase.id.split("-")[1]}`;
  const period = { id: makeId("per"), planId, planName: plan.name, limits: { ...plan.limits }, maxSessionMinutes: plan.maxSessionMinutes, startsAt: new Date(start).toISOString(), endsAt: end.toISOString(), purchaseId: purchase.id };
  purchase.periodId = period.id;
  a.purchases.push(purchase);
  a.periods.push(period);
  return { purchase, period, startsLater: start > t };
}

// ---------- Session limits per period (nothing is unlimited) ----------

export const MODES = ["chat", "audio", "video"];
const COUNTED = ["active", "completed"]; // a session counts once it has started; missed / declined / cancelled don't

/**
 * Sessions used and left in the CURRENT period, per type. Upcoming bookings inside the period are reserved,
 * so an astrologer can't take more bookings than the plan allows. Unused sessions don't carry over.
 */
export function getUsage(id) {
  const a = acct(id);
  const sub = getSubscription(id);
  const p = sub.current;
  if (!p) return { period: null, maxSessionMinutes: 0, modes: Object.fromEntries(MODES.map((m) => [m, { limit: 0, used: 0, reserved: 0, left: 0, full: true }])) };
  const from = new Date(p.startsAt).getTime();
  const to = new Date(p.endsAt).getTime();
  const inPeriod = (d) => d && new Date(d).getTime() >= from && new Date(d).getTime() < to;
  const modes = {};
  for (const m of MODES) {
    // Plan limit + extra sessions granted by a SaaS admin for this period
    const bonus = p.bonus?.[m] ?? 0;
    const limit = (p.limits?.[m] ?? 0) + bonus;
    const used = a.sessions.filter((x) => x.mode === m && COUNTED.includes(x.status) && inPeriod(x.startedAt)).length;
    const reserved = a.bookings.filter((b) => b.mode === m && b.status === "upcoming" && inPeriod(b.scheduledAt)).length;
    const left = Math.max(0, limit - used - reserved);
    modes[m] = { limit, bonus, used, reserved, left, full: left <= 0 };
  }
  return { period: { id: p.id, planName: p.planName, startsAt: p.startsAt, endsAt: p.endsAt }, maxSessionMinutes: p.maxSessionMinutes || 0, modes };
}

/** Throws when a new session / booking of this type isn't allowed by the plan right now. */
export function assertQuota(id, mode) {
  const u = getUsage(id);
  if (!u.period) throw new SaasError("You need an active plan to take personal consultations", "NO_PLAN");
  const q = u.modes[mode];
  const label = mode === "audio" ? "voice call" : mode === "video" ? "video call" : "chat";
  if (!q || q.full) throw new SaasError(`Your ${label} limit for this plan is used up (${q?.limit ?? 0} per period). It resets when your next period starts.`, "LIMIT_REACHED");
  return q;
}

// ---------- Eligibility (every condition separately; no single "isSubscribed" flag) ----------

export function getEligibility(id) {
  const a = acct(id);
  const sub = getSubscription(id);
  const checks = [
    { key: "verified", label: "Verified astrologer", ok: a.account.verified },
    { key: "subscription", label: "Active subscription", ok: sub.status === "active" },
    { key: "approval", label: "Personal profile approved", ok: a.account.profileApproval.status === "approved" },
    { key: "enabled", label: "Personal consultations switched on", ok: a.account.personalEnabled },
    { key: "account", label: "SaaS account active", ok: a.account.saasStatus === "active" },
  ];
  const canConsult = checks.every((c) => c.ok);
  // Which consultation types customers can use right now: switched on in Services AND sessions left in the plan
  const usage = getUsage(id);
  const modes = Object.fromEntries(MODES.map((m) => [m, canConsult && a.services[m].enabled && !usage.modes[m].full]));
  return { canConsult, checks, subscription: sub, approval: a.account.profileApproval, usage, modes };
}

// ---------- Account / overview ----------

export function getAccount(id) {
  const a = acct(id);
  const el = getEligibility(id);
  return {
    ...a.account,
    displayName: a.profile.displayName,
    photoUrl: a.profile.photoUrl,
    // Personal service is offline whenever it isn't eligible (e.g. subscription expired)
    presence: el.canConsult ? a.account.presence : "offline",
    canConsult: el.canConsult,
    publicUrl: `consult.astrokaalchakra.com/${a.account.slug}`,
  };
}

export function setPresence(id, presence) {
  if (!["online", "busy", "offline"].includes(presence)) throw new SaasError("Invalid status", "BAD_STATUS");
  const a = acct(id);
  if (presence !== "offline" && !getEligibility(id).canConsult) throw new SaasError("Your personal service can't go online until every activation step is complete", "NOT_ELIGIBLE");
  a.account.presence = presence;
  return presence;
}

export function setPersonalEnabled(id, enabled) {
  const a = acct(id);
  a.account.personalEnabled = Boolean(enabled);
  if (!enabled) a.account.presence = "offline";
  return a.account.personalEnabled;
}

export function getOverview(id) {
  const a = acct(id);
  const t = now();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const completed = a.sessions.filter((s) => s.status === "completed");
  const monthSessions = completed.filter((s) => new Date(s.endedAt) >= startOfMonth);
  const upcoming = a.bookings.filter((b) => b.status === "upcoming" && new Date(b.scheduledAt).getTime() > t).sort((x, y) => new Date(x.scheduledAt) - new Date(y.scheduledAt));
  const rated = a.feedback.filter((f) => f.rating);
  const e = getEarnings(id);
  return {
    stats: {
      upcomingBookings: upcoming.length,
      monthSessions: monthSessions.length,
      monthMinutes: Math.round(monthSessions.reduce((s, x) => s + x.durationSec, 0) / 60),
      monthEarnings: monthSessions.reduce((s, x) => s + x.amount, 0),
      balance: e.balance,
      followers: a.followers.length,
      rating: rated.length ? Math.round((rated.reduce((s, f) => s + f.rating, 0) / rated.length) * 10) / 10 : null,
      ratingCount: rated.length,
    },
    nextBookings: upcoming.slice(0, 4),
    waiting: a.sessions.filter((s) => s.status === "waiting"),
    recentSessions: completed.sort((x, y) => new Date(y.endedAt) - new Date(x.endedAt)).slice(0, 5),
    recentFeedback: [...a.feedback].sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt)).slice(0, 3),
  };
}

// ---------- Profile (submitted for admin approval) ----------

export const getProfile = (id) => {
  const a = acct(id);
  return { profile: { ...a.profile }, approval: a.account.profileApproval, slug: a.account.slug };
};

export function updateProfile(id, patch, { submit = false } = {}) {
  const a = acct(id);
  const p = { ...a.profile, ...patch };
  if (submit) {
    const missing = [];
    if (!p.displayName?.trim()) missing.push("display name");
    if (!p.headline?.trim()) missing.push("headline");
    if ((p.bio || "").trim().length < 50) missing.push("bio (at least 50 characters)");
    if (!p.languages?.length) missing.push("languages");
    if (!p.expertise?.length) missing.push("expertise");
    if (missing.length) throw new SaasError(`Please complete: ${missing.join(", ")}`, "INCOMPLETE");
  }
  a.profile = p;
  const st = a.account.profileApproval.status;
  // An approved profile that is edited goes back for review only for public text (demo: any change)
  if (submit || st === "approved") a.account.profileApproval = { status: "pending", submittedAt: new Date().toISOString(), reviewedAt: null, note: null };
  return getProfile(id);
}

// ---------- Profile photo (live at once: no approval, approval status untouched) ----------

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PHOTO_MAX_BYTES = 900 * 1024;

/** The stored photo { data, type } for the image route, or null. */
export function getPhoto(id) {
  return store.photos?.[id] || null;
}

/** Saves the astrologer's photo (bytes already checked by the action). The `?v=` changes so browsers fetch the new one. */
export function setProfilePhoto(id, { data, type }) {
  const a = acct(id);
  if (!PHOTO_TYPES.includes(type) || !data?.length || data.length > PHOTO_MAX_BYTES) throw new SaasError("Please choose a JPG, PNG or WebP photo", "BAD_PHOTO");
  store.photos ||= {};
  store.photos[id] = { data, type };
  a.profile.photoUrl = `/media/astrologer/${encodeURIComponent(id)}?v=${now()}`;
  return { photoUrl: a.profile.photoUrl };
}

export function removeProfilePhoto(id) {
  const a = acct(id);
  if (store.photos) delete store.photos[id];
  a.profile.photoUrl = null;
  return { photoUrl: null };
}

// ---------- Services & availability (personal prices only — marketplace prices never change) ----------

export const PRICE_LIMITS = { min: 1000, max: 100000 }; // ₹10 – ₹1,000 per minute (admin-set)

export const getServices = (id) => ({ ...acct(id).services, limits: PRICE_LIMITS });

export function updateServices(id, patch) {
  const a = acct(id);
  const next = { ...a.services };
  for (const mode of ["chat", "audio", "video"]) {
    if (!patch[mode]) continue;
    const price = Math.round(Number(patch[mode].price));
    if (!Number.isInteger(price) || price < PRICE_LIMITS.min || price > PRICE_LIMITS.max) throw new SaasError(`${mode} price must be between ₹${PRICE_LIMITS.min / 100} and ₹${PRICE_LIMITS.max / 100} per minute`, "BAD_PRICE");
    next[mode] = { enabled: Boolean(patch[mode].enabled), price };
  }
  if (!next.chat.enabled && !next.audio.enabled && !next.video.enabled) throw new SaasError("Keep at least one consultation type switched on", "NO_MODE");
  if (patch.talkNow !== undefined) next.talkNow = Boolean(patch.talkNow);
  if (patch.slotMinutes !== undefined) {
    if (![5, 10, 20, 30, 60].includes(Number(patch.slotMinutes))) throw new SaasError("Longest session must be 5, 10, 20, 30 or 60 minutes", "BAD_SLOT");
    const max = getUsage(id).maxSessionMinutes;
    if (max && Number(patch.slotMinutes) > max) throw new SaasError(`Your plan allows sessions of up to ${max} minutes`, "SLOT_TOO_LONG");
    next.slotMinutes = Number(patch.slotMinutes);
  }
  a.services = next;
  return getServices(id);
}

export const getAvailability = (id) => structuredClone(acct(id).availability);

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
export function updateAvailability(id, next) {
  const a = acct(id);
  const weekly = {};
  for (const day of ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]) {
    const slots = (next.weekly?.[day] || []).map((s) => ({ from: s.from, to: s.to }));
    for (const s of slots) {
      if (!HHMM.test(s.from) || !HHMM.test(s.to) || s.from >= s.to) throw new SaasError(`Check the hours on ${day.toUpperCase()}: start must be before end`, "BAD_HOURS");
    }
    const sorted = [...slots].sort((x, y) => x.from.localeCompare(y.from));
    for (let i = 1; i < sorted.length; i++) if (sorted[i].from < sorted[i - 1].to) throw new SaasError(`Hours overlap on ${day.toUpperCase()}`, "OVERLAP");
    weekly[day] = sorted;
  }
  const daysOff = [...new Set((next.daysOff || []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort();
  const bookingWindowDays = Math.max(1, Math.min(60, Number(next.bookingWindowDays) || 14));
  a.availability = { ...a.availability, weekly, daysOff, bookingWindowDays };
  return getAvailability(id);
}

// ---------- Bookings (cancel up to 1 hour before; nothing charged until the session) ----------

export const CANCEL_CUTOFF_MS = TIME.HOUR;

export function listBookings(id, { tab = "upcoming" } = {}) {
  const a = acct(id);
  const t = now();
  const all = [...a.bookings].map((b) => ({ ...b, canCancel: b.status === "upcoming" && new Date(b.scheduledAt).getTime() - t > CANCEL_CUTOFF_MS }));
  const upcoming = all.filter((b) => b.status === "upcoming").sort((x, y) => new Date(x.scheduledAt) - new Date(y.scheduledAt));
  const past = all.filter((b) => b.status !== "upcoming").sort((x, y) => new Date(y.scheduledAt) - new Date(x.scheduledAt));
  return { tab, upcoming, past, counts: { upcoming: upcoming.length, past: past.length } };
}

export function cancelBooking(id, bookingId, reason) {
  const a = acct(id);
  const b = a.bookings.find((x) => x.id === bookingId);
  if (!b) throw new SaasError("Booking not found", "NOT_FOUND");
  if (b.status !== "upcoming") throw new SaasError("Only upcoming bookings can be cancelled", "NOT_UPCOMING");
  if (new Date(b.scheduledAt).getTime() - now() <= CANCEL_CUTOFF_MS) throw new SaasError("Bookings can only be cancelled more than 1 hour before the start time", "TOO_LATE");
  Object.assign(b, { status: "cancelled_by_astrologer", cancelledAt: new Date().toISOString(), cancelReason: reason || null });
  return b;
}

// ---------- Consultations ----------

export function listSessions(id) {
  const a = acct(id);
  return {
    waiting: a.sessions.filter((s) => s.status === "waiting"),
    history: a.sessions.filter((s) => s.status !== "waiting").sort((x, y) => new Date(y.endedAt || y.expiredAt) - new Date(x.endedAt || x.expiredAt)),
  };
}

// ---------- Followers & feedback (personal page only) ----------

export const listFollowers = (id) => [...acct(id).followers].sort((x, y) => new Date(y.followedAt) - new Date(x.followedAt));

export function listFeedback(id) {
  const items = [...acct(id).feedback].sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt));
  const rated = items.filter((f) => f.rating);
  const dist = [5, 4, 3, 2, 1].map((n) => ({ stars: n, count: rated.filter((f) => f.rating === n).length }));
  return { items, average: rated.length ? Math.round((rated.reduce((s, f) => s + f.rating, 0) / rated.length) * 10) / 10 : null, count: rated.length, distribution: dist };
}

export function replyFeedback(id, feedbackId, text) {
  const f = acct(id).feedback.find((x) => x.id === feedbackId);
  if (!f) throw new SaasError("Feedback not found", "NOT_FOUND");
  const clean = String(text || "").trim();
  if (clean.length > 500) throw new SaasError("Reply can be at most 500 characters", "TOO_LONG");
  f.reply = clean ? { text: clean, at: new Date().toISOString() } : null;
  return f;
}

// ---------- Earnings & payouts (separate SaaS ledger; no marketplace commission) ----------

const fyStart = (d = new Date()) => new Date(d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1, 3, 1);

export function payoutBreakdown(id, amount) {
  const rules = store.payoutRules;
  const a = acct(id);
  const fyEarned = a.ledger.filter((l) => l.type === "credit" && new Date(l.createdAt) >= fyStart()).reduce((s, l) => s + l.amount, 0);
  const gstApplies = fyEarned > rules.gstThresholdFy;
  const tds = Math.round((amount * rules.tdsPercent) / 100);
  const gst = gstApplies ? Math.round((amount * rules.gstPercent) / 100) : 0;
  return { amount, tds, tdsPercent: rules.tdsPercent, gst, gstPercent: rules.gstPercent, gstApplies, gstThresholdFy: rules.gstThresholdFy, fyEarned, net: amount - tds - gst };
}

export function getEarnings(id) {
  const a = acct(id);
  const credits = a.ledger.filter((l) => l.type === "credit").reduce((s, l) => s + l.amount, 0);
  const debits = a.ledger.filter((l) => l.type === "debit").reduce((s, l) => s + l.amount, 0);
  const pending = a.payouts.filter((p) => p.status === "requested" || p.status === "approved").reduce((s, p) => s + p.amount, 0);
  return {
    balance: credits - debits, // withdrawable (pending requests are already debited)
    lifetime: credits,
    paidOut: a.payouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.net, 0),
    pending,
    ledger: [...a.ledger].sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt)),
    payouts: [...a.payouts].sort((x, y) => new Date(y.requestedAt) - new Date(x.requestedAt)),
    rules: store.payoutRules,
    payoutMethod: a.settings.payoutMethod,
  };
}

export function requestPayout(id, amount) {
  const a = acct(id);
  const amt = Math.round(Number(amount));
  const e = getEarnings(id);
  if (!Number.isInteger(amt) || amt <= 0) throw new SaasError("Enter a valid amount", "BAD_AMOUNT");
  if (amt < store.payoutRules.minPayout) throw new SaasError(`Minimum payout is ₹${store.payoutRules.minPayout / 100}`, "BELOW_MIN");
  if (amt > e.balance) throw new SaasError("Amount is more than your available balance", "INSUFFICIENT");
  if (a.payouts.some((p) => p.status === "requested")) throw new SaasError("You already have a payout request in review", "PENDING_EXISTS");
  if (!a.settings.payoutMethod?.verified) throw new SaasError("Add a verified bank account first", "NO_BANK");
  const b = payoutBreakdown(id, amt);
  const p = { id: makeId("po"), amount: amt, tds: b.tds, gst: b.gst, net: b.net, status: "requested", requestedAt: new Date().toISOString(), method: a.settings.payoutMethod.type };
  p.code = `SPO-${p.id.split("-")[1]}`;
  a.payouts.push(p);
  a.ledger.push({ id: makeId("led"), type: "debit", category: "payout", amount: amt, description: "Payout request", ref: p.code, createdAt: p.requestedAt });
  return p;
}

// ---------- Kundali ----------

export const listKundali = (id) => [...acct(id).kundali].sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt));

export function addKundali(id, { name, gender, dob, tob, place, region, lat, lng, tz }) {
  if (!String(name || "").trim() || !/^\d{4}-\d{2}-\d{2}$/.test(dob || "") || !String(place || "").trim()) throw new SaasError("Name, date of birth and place are required", "INCOMPLETE");
  const coords = Number.isFinite(lat) && Number.isFinite(lng);
  const k = { id: makeId("kd"), name: name.trim(), gender: gender === "male" || gender === "female" ? gender : "", dob, tob: tob || null, place: place.trim(), region: region || "", lat: coords ? lat : null, lng: coords ? lng : null, tz: tz || null, createdAt: new Date().toISOString(), forBooking: null };
  acct(id).kundali.push(k);
  return k;
}

export function removeKundali(id, kundaliId) {
  const list = acct(id).kundali;
  const i = list.findIndex((k) => k.id === kundaliId);
  if (i < 0) throw new SaasError("Kundali not found", "NOT_FOUND");
  list.splice(i, 1);
  return listKundali(id);
}

// ---------- Settings ----------

export const getSettings = (id) => structuredClone(acct(id).settings);

export function updateSettings(id, patch) {
  const a = acct(id);
  if (patch.notifications) a.settings.notifications = { ...a.settings.notifications, ...Object.fromEntries(Object.entries(patch.notifications).map(([k, v]) => [k, Boolean(v)])) };
  return getSettings(id);
}
