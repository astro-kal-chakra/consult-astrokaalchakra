import "server-only";
import { store, makeId, TIME } from "./store";
import { SaasError, getEligibility, getSubscription, getUsage, getEarnings, listPlans, listFeedback, MODES, updateAvailability, updateServices } from "./saas";

/**
 * SaaS admin data + actions (verification, access, plans, session limits, subscriptions, payouts, feedback,
 * settings, audit). DEMO: in-memory store. REAL: AstroBackend-pg SaaS admin API.
 * Every change writes an append-only audit entry (who, what, target, reason, before → after).
 */

const accounts = () => Object.values(store.accounts);
const acct = (aid) => {
  const a = store.accounts[aid];
  if (!a) throw new SaasError("Astrologer not found", "NOT_FOUND");
  return a;
};
const needReason = (reason) => {
  const r = String(reason || "").trim();
  if (r.length < 3) throw new SaasError("Please write a reason (at least 3 characters)", "REASON_REQUIRED");
  return r.slice(0, 500);
};

// ---------- Audit ----------

export function audit(admin, action, { target = null, reason = null, before = null, after = null } = {}) {
  store.audit.unshift({ id: makeId("aud"), at: new Date().toISOString(), adminId: admin.id, adminName: admin.name, role: admin.role, action, target, reason, before, after });
}

export function listAudit({ q = "" } = {}) {
  const n = String(q).trim().toLowerCase();
  return store.audit.filter((e) => !n || [e.action, e.adminName, e.target, e.reason].some((x) => String(x || "").toLowerCase().includes(n)));
}

// ---------- Overview ----------

export function getAdminOverview() {
  const t = Date.now();
  const all = accounts();
  const subs = all.map((a) => getSubscription(a.account.id));
  const purchases = all.flatMap((a) => a.purchases.filter((p) => p.status === "paid"));
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthPurchases = purchases.filter((p) => new Date(p.paidAt) >= monthStart);
  const sessions = all.flatMap((a) => a.sessions);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return {
    astrologers: {
      total: all.length,
      live: all.filter((a) => getEligibility(a.account.id).canConsult).length,
      pendingApproval: all.filter((a) => a.account.profileApproval.status === "pending").length,
      unverified: all.filter((a) => !a.account.verified).length,
      suspended: all.filter((a) => a.account.saasStatus === "suspended").length,
    },
    subscriptions: {
      active: subs.filter((s) => s.status === "active").length,
      expired: subs.filter((s) => s.status === "expired").length,
      expiringIn7Days: subs.filter((s) => s.status === "active" && s.daysLeft <= 7 && !s.queued.length).length,
      revenueThisMonth: monthPurchases.reduce((s, p) => s + p.amount, 0),
      gstThisMonth: monthPurchases.reduce((s, p) => s + p.gst, 0),
      revenueAll: purchases.reduce((s, p) => s + p.amount, 0),
    },
    consultations: {
      today: sessions.filter((s) => s.status === "completed" && new Date(s.endedAt) >= today).length,
      live: sessions.filter((s) => s.status === "active").length,
      waiting: sessions.filter((s) => s.status === "waiting" && new Date(s.expiresAt).getTime() > t).length,
      upcomingBookings: all.flatMap((a) => a.bookings).filter((b) => b.status === "upcoming").length,
      gmvThisMonth: sessions.filter((s) => s.status === "completed" && new Date(s.endedAt) >= monthStart).reduce((x, s) => x + s.amount, 0),
    },
    payouts: {
      requested: all.flatMap((a) => a.payouts).filter((p) => p.status === "requested").length,
      requestedAmount: all.flatMap((a) => a.payouts).filter((p) => p.status === "requested").reduce((s, p) => s + p.amount, 0),
    },
  };
}

// ---------- Astrologers ----------

function row(a) {
  const id = a.account.id;
  const el = getEligibility(id);
  const sub = el.subscription;
  const usage = getUsage(id);
  return {
    id,
    name: a.profile.displayName,
    slug: a.account.slug,
    phone: a.account.phone,
    city: a.profile.city,
    verified: a.account.verified,
    saasStatus: a.account.saasStatus,
    approval: a.account.profileApproval.status,
    personalEnabled: a.account.personalEnabled,
    presence: el.canConsult ? a.account.presence : "offline",
    live: el.canConsult,
    subscription: { status: sub.status, plan: sub.current?.planName || sub.queued[0]?.planName || null, endsAt: sub.current?.endsAt || null, paidUntil: sub.paidUntil, daysLeft: sub.daysLeft },
    usage: usage.period ? Object.fromEntries(MODES.map((m) => [m, { left: usage.modes[m].left, limit: usage.modes[m].limit }])) : null,
    sessionsTotal: a.sessions.filter((s) => s.status === "completed").length,
  };
}

/** filter: all | live | pending | expired | no_plan | suspended | unverified */
export function listAstrologers({ filter = "all", q = "" } = {}) {
  const n = String(q).trim().toLowerCase();
  const rows = accounts().map(row);
  const counts = {
    all: rows.length,
    live: rows.filter((r) => r.live).length,
    pending: rows.filter((r) => r.approval === "pending").length,
    expired: rows.filter((r) => r.subscription.status === "expired").length,
    no_plan: rows.filter((r) => r.subscription.status === "none").length,
    suspended: rows.filter((r) => r.saasStatus === "suspended").length,
    unverified: rows.filter((r) => !r.verified).length,
  };
  const pick = {
    all: () => true,
    live: (r) => r.live,
    pending: (r) => r.approval === "pending",
    expired: (r) => r.subscription.status === "expired",
    no_plan: (r) => r.subscription.status === "none",
    suspended: (r) => r.saasStatus === "suspended",
    unverified: (r) => !r.verified,
  }[filter] || (() => true);
  return {
    counts,
    rows: rows.filter(pick).filter((r) => !n || [r.name, r.phone, r.slug, r.city].some((x) => String(x || "").toLowerCase().includes(n))),
  };
}

export function getAstrologerAdmin(aid) {
  const a = acct(aid);
  const el = getEligibility(aid);
  return {
    summary: row(a),
    checks: el.checks,
    profile: { ...a.profile },
    approval: { ...a.account.profileApproval },
    services: { ...a.services },
    availability: a.availability,
    subscription: getSubscription(aid),
    usage: getUsage(aid),
    earnings: (({ balance, lifetime, paidOut, pending, payouts }) => ({ balance, lifetime, paidOut, pending, payouts }))(getEarnings(aid)),
    bookings: [...a.bookings].sort((x, y) => new Date(y.scheduledAt) - new Date(x.scheduledAt)).slice(0, 20),
    sessions: [...a.sessions].sort((x, y) => new Date(y.endedAt || y.requestedAt || 0) - new Date(x.endedAt || x.requestedAt || 0)).slice(0, 20),
    followers: a.followers.length,
    followerList: listAstrologerFollowers(aid),
    audit: store.audit.filter((e) => e.target === aid).slice(0, 30),
  };
}

export function approveProfile(admin, aid, note) {
  const a = acct(aid);
  if (a.account.profileApproval.status !== "pending") throw new SaasError("Only profiles waiting for review can be approved", "NOT_PENDING");
  const before = a.account.profileApproval.status;
  a.account.profileApproval = { status: "approved", submittedAt: a.account.profileApproval.submittedAt, reviewedAt: new Date().toISOString(), note: String(note || "").trim() || null };
  audit(admin, "profile.approve", { target: aid, reason: note || null, before, after: "approved" });
  return a.account.profileApproval;
}

export function rejectProfile(admin, aid, reason) {
  const a = acct(aid);
  const r = needReason(reason);
  if (a.account.profileApproval.status !== "pending") throw new SaasError("Only profiles waiting for review can be rejected", "NOT_PENDING");
  a.account.profileApproval = { status: "rejected", submittedAt: a.account.profileApproval.submittedAt, reviewedAt: new Date().toISOString(), note: r };
  a.account.presence = "offline";
  audit(admin, "profile.reject", { target: aid, reason: r, before: "pending", after: "rejected" });
  return a.account.profileApproval;
}

/** Suspend / reactivate the personal service only — the marketplace account is never touched. */
export function setSuspended(admin, aid, suspended, reason) {
  const a = acct(aid);
  const r = needReason(reason);
  const before = a.account.saasStatus;
  a.account.saasStatus = suspended ? "suspended" : "active";
  if (suspended) a.account.presence = "offline";
  audit(admin, suspended ? "astrologer.suspend" : "astrologer.reactivate", { target: aid, reason: r, before, after: a.account.saasStatus });
  return a.account.saasStatus;
}

/** Extra sessions for the CURRENT period only (e.g. goodwill, a technical problem). Never unlimited. */
export function grantSessions(admin, aid, mode, count, reason) {
  const r = needReason(reason);
  if (!MODES.includes(mode)) throw new SaasError("Choose chat, voice or video", "BAD_MODE");
  const n = Math.round(Number(count));
  if (!Number.isInteger(n) || n < 1 || n > 100) throw new SaasError("Grant between 1 and 100 sessions at a time", "BAD_COUNT");
  const a = acct(aid);
  const sub = getSubscription(aid);
  if (!sub.current) throw new SaasError("This astrologer has no active period to add sessions to", "NO_PERIOD");
  const p = a.periods.find((x) => x.id === sub.current.id);
  p.bonus = { ...(p.bonus || {}), [mode]: (p.bonus?.[mode] || 0) + n };
  audit(admin, "sessions.grant", { target: aid, reason: r, before: null, after: `+${n} ${mode} (period ${p.planName})` });
  return getUsage(aid);
}

/** Adds days to the current (or last) paid period; queued periods move later by the same amount (no overlap). */
export function extendSubscription(admin, aid, days, reason) {
  const r = needReason(reason);
  const d = Math.round(Number(days));
  if (!Number.isInteger(d) || d < 1 || d > 90) throw new SaasError("Extend by 1 to 90 days", "BAD_DAYS");
  const a = acct(aid);
  const sub = getSubscription(aid);
  const target = sub.current || [...a.periods].sort((x, y) => new Date(y.endsAt) - new Date(x.endsAt))[0];
  if (!target) throw new SaasError("This astrologer has never had a plan", "NO_PERIOD");
  const p = a.periods.find((x) => x.id === target.id);
  const before = p.endsAt;
  const shift = d * TIME.DAY;
  const oldEnd = new Date(p.endsAt).getTime();
  // An expired period is extended from now, so the extra days are actually usable
  const base = sub.current ? oldEnd : Math.max(oldEnd, Date.now());
  if (!sub.current) p.startsAt = new Date(Date.now()).toISOString();
  p.endsAt = new Date(base + shift).toISOString();
  for (const q of a.periods) {
    if (q.id !== p.id && new Date(q.startsAt).getTime() >= oldEnd) {
      q.startsAt = new Date(new Date(q.startsAt).getTime() + (new Date(p.endsAt).getTime() - oldEnd)).toISOString();
      q.endsAt = new Date(new Date(q.endsAt).getTime() + (new Date(p.endsAt).getTime() - oldEnd)).toISOString();
    }
  }
  audit(admin, "subscription.extend", { target: aid, reason: r, before, after: p.endsAt });
  return getSubscription(aid);
}

// ---------- Subscriptions & payments ----------

export function listPurchases({ status = "all", q = "" } = {}) {
  const n = String(q).trim().toLowerCase();
  return accounts()
    .flatMap((a) => a.purchases.map((p) => ({ ...p, astrologer: { id: a.account.id, name: a.profile.displayName } })))
    .filter((p) => status === "all" || p.status === status)
    .filter((p) => !n || [p.code, p.astrologer.name, p.planName, p.razorpayPaymentId, p.invoiceNo].some((x) => String(x || "").toLowerCase().includes(n)))
    .sort((x, y) => new Date(y.paidAt) - new Date(x.paidAt));
}

export function listSubscriptions({ status = "all" } = {}) {
  return accounts()
    .map((a) => ({ astrologer: { id: a.account.id, name: a.profile.displayName }, ...getSubscription(a.account.id), usage: getUsage(a.account.id) }))
    .filter((s) => status === "all" || s.status === status);
}

// ---------- Plans (new purchases only — paid periods keep what they bought) ----------

export function updatePlan(admin, planId, patch) {
  const p = store.plans.find((x) => x.id === planId);
  if (!p) throw new SaasError("Plan not found", "NOT_FOUND");
  const before = JSON.stringify({ price: p.price, limits: p.limits, maxSessionMinutes: p.maxSessionMinutes, active: p.active !== false });
  if (patch.price !== undefined) {
    const v = Math.round(Number(patch.price));
    if (!Number.isInteger(v) || v < 10000 || v > 10000000) throw new SaasError("Price must be between ₹100 and ₹1,00,000", "BAD_PRICE");
    p.price = v;
  }
  if (patch.limits) {
    const next = { ...p.limits };
    for (const m of MODES) {
      if (patch.limits[m] === undefined) continue;
      const v = Math.round(Number(patch.limits[m]));
      // Never unlimited: every type needs a fixed number
      if (!Number.isInteger(v) || v < 0 || v > 5000) throw new SaasError("Session limits must be whole numbers from 0 to 5,000", "BAD_LIMIT");
      next[m] = v;
    }
    p.limits = next;
  }
  if (patch.maxSessionMinutes !== undefined) {
    const v = Number(patch.maxSessionMinutes);
    if (![10, 20, 30, 45, 60].includes(v)) throw new SaasError("Max session length must be 10, 20, 30, 45 or 60 minutes", "BAD_MAX");
    p.maxSessionMinutes = v;
  }
  if (patch.active !== undefined) p.active = Boolean(patch.active);
  if (patch.name !== undefined) {
    const v = String(patch.name).trim();
    if (v.length < 2 || v.length > 40) throw new SaasError("Plan name must be 2–40 characters", "BAD_NAME");
    p.name = v;
  }
  audit(admin, "plan.update", { target: planId, before, after: JSON.stringify({ price: p.price, limits: p.limits, maxSessionMinutes: p.maxSessionMinutes, active: p.active !== false }) });
  return listPlans({ all: true }).find((x) => x.id === planId);
}

// ---------- Consultations (all astrologers) ----------

export function listAllBookings({ status = "all" } = {}) {
  return accounts()
    .flatMap((a) => a.bookings.map((b) => ({ ...b, astrologer: { id: a.account.id, name: a.profile.displayName } })))
    .filter((b) => status === "all" || b.status === status)
    .sort((x, y) => new Date(y.scheduledAt) - new Date(x.scheduledAt));
}

export function listAllSessions({ status = "all" } = {}) {
  return accounts()
    .flatMap((a) => a.sessions.map((s) => ({ ...s, messages: undefined, astrologer: { id: a.account.id, name: a.profile.displayName } })))
    .filter((s) => status === "all" || s.status === status)
    .sort((x, y) => new Date(y.endedAt || y.requestedAt || y.expiredAt || 0) - new Date(x.endedAt || x.requestedAt || x.expiredAt || 0));
}

// ---------- Payouts (SaaS earnings; no marketplace commission) ----------

export function listAllPayouts({ status = "all" } = {}) {
  return accounts()
    .flatMap((a) => a.payouts.map((p) => ({ ...p, astrologer: { id: a.account.id, name: a.profile.displayName }, bank: a.settings.payoutMethod })))
    .filter((p) => status === "all" || p.status === status)
    .sort((x, y) => new Date(y.requestedAt) - new Date(x.requestedAt));
}

function findPayout(payoutId) {
  for (const a of accounts()) {
    const p = a.payouts.find((x) => x.id === payoutId);
    if (p) return { a, p };
  }
  throw new SaasError("Payout not found", "NOT_FOUND");
}

export function approvePayout(admin, payoutId) {
  const { a, p } = findPayout(payoutId);
  if (p.status !== "requested") throw new SaasError("Only requested payouts can be approved", "BAD_STATUS");
  p.status = "approved";
  p.reviewedAt = new Date().toISOString();
  audit(admin, "payout.approve", { target: a.account.id, before: "requested", after: `approved ${p.code}` });
  return p;
}

export function rejectPayout(admin, payoutId, reason) {
  const r = needReason(reason);
  const { a, p } = findPayout(payoutId);
  if (!["requested", "approved"].includes(p.status)) throw new SaasError("This payout can't be rejected now", "BAD_STATUS");
  const before = p.status;
  Object.assign(p, { status: "rejected", reviewedAt: new Date().toISOString(), remarks: r });
  // The amount goes back to the astrologer's SaaS balance
  a.ledger.push({ id: makeId("led"), type: "credit", category: "payout_reversal", amount: p.amount, description: "Payout rejected, amount returned", ref: p.code, createdAt: p.reviewedAt });
  audit(admin, "payout.reject", { target: a.account.id, reason: r, before, after: `rejected ${p.code}` });
  return p;
}

export function markPayoutPaid(admin, payoutId, utr) {
  const { a, p } = findPayout(payoutId);
  const u = String(utr || "").trim();
  if (!/^[A-Za-z0-9]{6,30}$/.test(u)) throw new SaasError("Enter the bank reference (UTR), 6–30 letters or numbers", "BAD_UTR");
  if (p.status !== "approved") throw new SaasError("Approve the payout before marking it paid", "BAD_STATUS");
  Object.assign(p, { status: "paid", paidAt: new Date().toISOString(), utr: u });
  audit(admin, "payout.paid", { target: a.account.id, before: "approved", after: `paid ${p.code} · UTR ${u}` });
  return p;
}

// ---------- Feedback moderation (SaaS feedback only) ----------

export function listAllFeedback({ kind = "all" } = {}) {
  return accounts()
    .flatMap((a) => a.feedback.map((f) => ({ ...f, astrologer: { id: a.account.id, name: a.profile.displayName } })))
    .filter((f) => kind === "all" || f.kind === kind || (kind === "hidden" && f.hidden))
    .sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt));
}

export function setFeedbackHidden(admin, feedbackId, hidden, reason) {
  const r = needReason(reason);
  for (const a of accounts()) {
    const f = a.feedback.find((x) => x.id === feedbackId);
    if (!f) continue;
    f.hidden = Boolean(hidden);
    audit(admin, hidden ? "feedback.hide" : "feedback.show", { target: a.account.id, reason: r, after: f.id });
    return f;
  }
  throw new SaasError("Feedback not found", "NOT_FOUND");
}

// ---------- Settings (payout rules) ----------

export const getSettingsAdmin = () => ({ payoutRules: { ...store.payoutRules } });

export function updatePayoutRules(admin, patch) {
  const before = JSON.stringify(store.payoutRules);
  const next = { ...store.payoutRules };
  const num = (v, min, max, label) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < min || n > max) throw new SaasError(`${label} must be between ${min} and ${max}`, "BAD_VALUE");
    return n;
  };
  if (patch.tdsPercent !== undefined) next.tdsPercent = num(patch.tdsPercent, 0, 30, "TDS %");
  if (patch.gstPercent !== undefined) next.gstPercent = num(patch.gstPercent, 0, 28, "GST %");
  if (patch.gstThresholdFy !== undefined) next.gstThresholdFy = Math.round(num(patch.gstThresholdFy, 0, 100000000, "GST threshold (paise)"));
  if (patch.minPayout !== undefined) next.minPayout = Math.round(num(patch.minPayout, 10000, 10000000, "Minimum payout (paise)"));
  Object.assign(store.payoutRules, next);
  audit(admin, "settings.payout_rules", { before, after: JSON.stringify(store.payoutRules) });
  return getSettingsAdmin();
}

// ---------- New plans ----------

/** Creates a new plan (fixed limits — nothing unlimited). Astrologers can buy it once it's switched on. */
export function createPlan(admin, input) {
  const name = String(input?.name || "").trim();
  if (name.length < 2 || name.length > 40) throw new SaasError("Plan name must be 2–40 characters", "BAD_NAME");
  const months = Number(input?.months);
  if (![1, 3, 6, 12].includes(months)) throw new SaasError("Duration must be 1, 3, 6 or 12 months", "BAD_MONTHS");
  const id = `plan-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${months}m-${Date.now().toString(36)}`;
  store.plans.push({ id, name, months, price: 0, gstPercent: 18, limits: { chat: 0, audio: 0, video: 0 }, maxSessionMinutes: 30, active: false, features: ["Personal consultation page", "Own prices & availability", "Bookings, followers & feedback", "Earnings dashboard & payouts"] });
  try {
    // Same checks as editing (price, limits, length)
    updatePlan(admin, id, { price: input.price, limits: input.limits, maxSessionMinutes: input.maxSessionMinutes, active: input.active !== false });
  } catch (e) {
    store.plans = store.plans.filter((p) => p.id !== id);
    store.audit = store.audit.filter((x) => x.target !== id);
    throw e;
  }
  const plan = store.plans.find((p) => p.id === id);
  if (input.badge) plan.badge = String(input.badge).trim().slice(0, 20) || undefined;
  if (!MODES.some((m) => plan.limits[m] > 0)) {
    store.plans = store.plans.filter((p) => p.id !== id);
    store.audit = store.audit.filter((x) => x.target !== id);
    throw new SaasError("Give the plan at least one chat, voice or video session", "EMPTY_PLAN");
  }
  store.audit = store.audit.filter((x) => !(x.target === id && x.action === "plan.update"));
  audit(admin, "plan.create", { target: id, after: JSON.stringify({ name, months, price: plan.price, limits: plan.limits, maxSessionMinutes: plan.maxSessionMinutes, active: plan.active !== false }) });
  return listPlans({ all: true }).find((p) => p.id === id);
}

// ---------- Give an astrologer a subscription (complimentary / offline payment) ----------

/**
 * Adds a paid-up period for an astrologer without online checkout: "complimentary" (free, e.g. launch offer)
 * or "offline" (payment received outside the app — bank transfer / UPI; a reference is required).
 * The period starts when their last paid period ends (or now), exactly like a purchase. Audited.
 */
export function assignSubscription(admin, aid, { planId, method, reference, reason } = {}) {
  const r = needReason(reason);
  const a = acct(aid);
  if (!a.account.verified) throw new SaasError("Only verified astrologers can get a subscription", "NOT_VERIFIED");
  const plan = listPlans({ all: true }).find((p) => p.id === planId);
  if (!plan) throw new SaasError("Choose a plan", "PLAN_NOT_FOUND");
  if (!["complimentary", "offline"].includes(method)) throw new SaasError("Choose complimentary or offline payment", "BAD_METHOD");
  const ref = String(reference || "").trim();
  if (method === "offline" && !/^[A-Za-z0-9/_-]{4,40}$/.test(ref)) throw new SaasError("Enter the payment reference (UTR / transaction id)", "BAD_REFERENCE");
  const now = Date.now();
  const lastEnd = a.periods.reduce((m, p) => Math.max(m, new Date(p.endsAt).getTime()), 0);
  const start = Math.max(now, lastEnd);
  const end = new Date(start);
  end.setMonth(end.getMonth() + plan.months);
  const free = method === "complimentary";
  const purchase = { id: makeId("pur"), planId: plan.id, planName: plan.name, amount: free ? 0 : plan.price, gst: free ? 0 : plan.gst, total: free ? 0 : plan.total, status: "paid", method, reference: ref || null, razorpayPaymentId: null, paidAt: new Date(now).toISOString(), addedBy: admin.name };
  purchase.code = `SUB-${purchase.id.split("-")[1]}`;
  purchase.invoiceNo = free ? null : `KC/SAAS/${purchase.id.split("-")[1]}`;
  const period = { id: makeId("per"), planId: plan.id, planName: plan.name, limits: { ...plan.limits }, maxSessionMinutes: plan.maxSessionMinutes, startsAt: new Date(start).toISOString(), endsAt: end.toISOString(), purchaseId: purchase.id };
  purchase.periodId = period.id;
  a.purchases.push(purchase);
  a.periods.push(period);
  audit(admin, "subscription.assign", { target: aid, reason: r, after: `${plan.name} (${free ? "complimentary" : `offline · ${ref}`}) ${period.startsAt.slice(0, 10)} → ${period.endsAt.slice(0, 10)}` });
  return { purchase, period, startsLater: start > now };
}

// ---------- Edit astrologer details (personal product only) ----------

const PROFILE_FIELDS = ["displayName", "headline", "bio", "experienceYears", "city", "languages", "expertise"];

/** Admin edit of the PERSONAL profile (the marketplace profile is separate and never changed here). */
export function updateAstrologerProfile(admin, aid, patch, reason) {
  const r = needReason(reason);
  const a = acct(aid);
  const before = {};
  const next = { ...a.profile };
  for (const k of PROFILE_FIELDS) {
    if (patch?.[k] === undefined) continue;
    before[k] = a.profile[k];
    if (k === "languages" || k === "expertise") {
      const list = (Array.isArray(patch[k]) ? patch[k] : String(patch[k]).split(",")).map((x) => String(x).trim()).filter(Boolean).slice(0, 15);
      if (!list.length) throw new SaasError(`Add at least one ${k === "languages" ? "language" : "expertise"}`, "EMPTY_LIST");
      next[k] = list;
    } else if (k === "experienceYears") {
      const n = Number(patch[k]);
      if (!Number.isInteger(n) || n < 0 || n > 70) throw new SaasError("Experience must be 0–70 years", "BAD_EXPERIENCE");
      next[k] = n;
    } else {
      const v = String(patch[k]).trim();
      const max = k === "bio" ? 2000 : k === "headline" ? 120 : 80;
      if (k === "displayName" && v.length < 2) throw new SaasError("Display name is too short", "BAD_NAME");
      next[k] = v.slice(0, max);
    }
  }
  a.profile = next;
  audit(admin, "astrologer.edit_profile", { target: aid, reason: r, before: JSON.stringify(before), after: JSON.stringify(Object.fromEntries(Object.keys(before).map((k) => [k, next[k]]))) });
  return { ...a.profile };
}

export function updateAstrologerServices(admin, aid, patch, reason) {
  const r = needReason(reason);
  const before = JSON.stringify(acct(aid).services);
  const out = updateServices(aid, patch || {});
  audit(admin, "astrologer.edit_services", { target: aid, reason: r, before, after: JSON.stringify(acct(aid).services) });
  return out;
}

export function updateAstrologerAvailability(admin, aid, next, reason) {
  const r = needReason(reason);
  const before = JSON.stringify(acct(aid).availability);
  const out = updateAvailability(aid, next || {});
  audit(admin, "astrologer.edit_availability", { target: aid, reason: r, before, after: JSON.stringify(out) });
  return out;
}

/** Personal consultations on / off for the astrologer (off also sets them offline). */
export function setPersonalEnabledAdmin(admin, aid, enabled, reason) {
  const r = needReason(reason);
  const a = acct(aid);
  const before = a.account.personalEnabled;
  a.account.personalEnabled = Boolean(enabled);
  if (!enabled) a.account.presence = "offline";
  audit(admin, enabled ? "astrologer.personal_on" : "astrologer.personal_off", { target: aid, reason: r, before: String(before), after: String(Boolean(enabled)) });
  return a.account.personalEnabled;
}

/** Forces the personal service offline (e.g. astrologer unreachable). */
export function forceOffline(admin, aid, reason) {
  const r = needReason(reason);
  const a = acct(aid);
  const before = a.account.presence;
  a.account.presence = "offline";
  audit(admin, "astrologer.force_offline", { target: aid, reason: r, before, after: "offline" });
  return "offline";
}

// ---------- Customers & activity ----------

const keyOf = (c) => (c?.id ? c.id : `name:${String(c?.name || "Customer").toLowerCase()}`);

/** Everyone who used personal consultations (booked, consulted, followed or gave feedback), with activity. */
function customerIndex() {
  const map = new Map();
  const get = (c) => {
    const k = keyOf(c);
    if (!map.has(k)) {
      const real = c?.id ? store.customers[c.id] : null;
      map.set(k, { id: k, name: c?.name || real?.name || "Customer", city: c?.city || real?.city || null, phone: real?.phone || null, registered: Boolean(real), wallet: real ? real.wallet.balance : null, bookings: 0, upcoming: 0, sessions: 0, minutes: 0, spend: 0, following: [], feedback: 0, lastActive: null, astrologers: new Set() });
    }
    return map.get(k);
  };
  const touch = (row, at) => {
    if (at && (!row.lastActive || new Date(at) > new Date(row.lastActive))) row.lastActive = at;
  };
  for (const a of accounts()) {
    const astro = { id: a.account.id, name: a.profile.displayName };
    for (const b of a.bookings) {
      const row = get(b.customer);
      row.bookings++;
      if (b.status === "upcoming") row.upcoming++;
      row.astrologers.add(astro.name);
      touch(row, b.createdAt);
    }
    for (const s of a.sessions) {
      if (!s.customer) continue;
      const row = get(s.customer);
      if (s.status === "completed") {
        row.sessions++;
        row.minutes += Math.round(s.durationSec / 60);
        row.spend += s.amount;
      }
      row.astrologers.add(astro.name);
      touch(row, s.endedAt || s.startedAt || s.requestedAt);
    }
    for (const f of a.followers) {
      const row = get({ id: f.customerId, name: f.name, city: f.city });
      row.following.push({ astrologerId: astro.id, astrologer: astro.name, at: f.followedAt });
      touch(row, f.followedAt);
    }
    for (const f of a.feedback) {
      const row = get(f.customer);
      row.feedback++;
      touch(row, f.createdAt);
    }
  }
  for (const c of Object.values(store.customers)) get({ id: c.id, name: c.name, city: c.city });
  return [...map.values()].map((r) => ({ ...r, astrologers: [...r.astrologers] }));
}

/** filter: all | active7 | active30 | followers | booked */
export function listCustomers({ q = "", filter = "all" } = {}) {
  const n = String(q).trim().toLowerCase();
  const t = Date.now();
  const all = customerIndex();
  const active = (r, days) => r.lastActive && t - new Date(r.lastActive).getTime() <= days * TIME.DAY;
  const counts = { all: all.length, active7: all.filter((r) => active(r, 7)).length, active30: all.filter((r) => active(r, 30)).length, followers: all.filter((r) => r.following.length).length, booked: all.filter((r) => r.upcoming).length };
  const pick = { all: () => true, active7: (r) => active(r, 7), active30: (r) => active(r, 30), followers: (r) => r.following.length, booked: (r) => r.upcoming }[filter] || (() => true);
  return {
    counts,
    rows: all
      .filter(pick)
      .filter((r) => !n || [r.name, r.city, r.phone].some((x) => String(x || "").toLowerCase().includes(n)))
      .sort((x, y) => new Date(y.lastActive || 0) - new Date(x.lastActive || 0)),
  };
}

export function getCustomerAdmin(customerId) {
  const row = customerIndex().find((r) => r.id === customerId);
  if (!row) throw new SaasError("Customer not found", "NOT_FOUND");
  const mine = (c) => keyOf(c) === customerId;
  const bookings = accounts().flatMap((a) => a.bookings.filter((b) => mine(b.customer)).map((b) => ({ ...b, astrologer: { id: a.account.id, name: a.profile.displayName } })));
  const sessions = accounts().flatMap((a) => a.sessions.filter((s) => s.customer && mine(s.customer)).map((s) => ({ ...s, messages: undefined, astrologer: { id: a.account.id, name: a.profile.displayName } })));
  const feedback = accounts().flatMap((a) => a.feedback.filter((f) => mine(f.customer)).map((f) => ({ ...f, astrologer: { id: a.account.id, name: a.profile.displayName } })));
  const real = customerId.startsWith("name:") ? null : store.customers[customerId];
  return {
    summary: row,
    bookings: bookings.sort((x, y) => new Date(y.scheduledAt) - new Date(x.scheduledAt)),
    sessions: sessions.sort((x, y) => new Date(y.endedAt || y.requestedAt || 0) - new Date(x.endedAt || x.requestedAt || 0)),
    feedback: feedback.sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt)),
    wallet: real ? { balance: real.wallet.balance, transactions: [...real.transactions].sort((x, y) => new Date(y.at) - new Date(x.at)) } : null,
  };
}

/** Followers of one astrologer's personal page (names, cities, dates). */
export function listAstrologerFollowers(aid) {
  return [...acct(aid).followers].sort((x, y) => new Date(y.followedAt) - new Date(x.followedAt)).map((f) => ({ ...f, customerKey: keyOf({ id: f.customerId, name: f.name }) }));
}

/** Activity numbers for the overview. */
export function getActivity() {
  const t = Date.now();
  const all = customerIndex();
  const sessions = accounts().flatMap((a) => a.sessions);
  return {
    customers: all.length,
    active7: all.filter((r) => r.lastActive && t - new Date(r.lastActive).getTime() <= 7 * TIME.DAY).length,
    active30: all.filter((r) => r.lastActive && t - new Date(r.lastActive).getTime() <= 30 * TIME.DAY).length,
    inSessionNow: new Set(sessions.filter((s) => s.status === "active" && s.customer).map((s) => keyOf(s.customer))).size,
    waitingNow: sessions.filter((s) => s.status === "waiting" && new Date(s.expiresAt).getTime() > t).length,
    followersTotal: accounts().reduce((x, a) => x + a.followers.length, 0),
    onlineAstrologers: accounts().filter((a) => getEligibility(a.account.id).canConsult && a.account.presence === "online").length,
    ratings: accounts().map((a) => {
      const f = listFeedback(a.account.id);
      return { id: a.account.id, name: a.profile.displayName, average: f.average, count: f.count, followers: a.followers.length };
    }),
  };
}
