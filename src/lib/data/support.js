import "server-only";
import { store, makeId, TIME } from "./store";
import { SaasError } from "./saas";
import { audit } from "./admin";

/**
 * Support tickets for the personal-consultation product: astrologers raise them from their dashboard, the
 * Personal Consultation Admin answers them. Separate from the marketplace's support.
 * DEMO: in-memory store. REAL: AstroBackend-pg SaaS support API.
 *
 * Status: open (waiting for our team) → answered (waiting for the astrologer) → closed.
 * An astrologer's reply re-opens an answered ticket, or a closed one within REOPEN_DAYS.
 */

export const SUPPORT_CATEGORIES = {
  subscription: "Subscription & plan payment",
  payouts: "Earnings & payouts",
  profile: "Profile & approval",
  bookings: "Bookings & sessions",
  customer: "A customer issue",
  technical: "Technical problem",
  other: "Something else",
};
export const SUPPORT_LIMITS = { subject: [5, 120], message: [10, 2000], maxOpen: 5 };
const REOPEN_DAYS = 7;

const tickets = () => (store.tickets ||= []);

const text = (v, [min, max], what) => {
  const t = String(v ?? "").trim();
  if (t.length < min) throw new SaasError(`Please write a ${what} (at least ${min} characters)`, "TOO_SHORT");
  return t.slice(0, max);
};

/** The fields shown to the astrologer and the admin (internal ids stay internal). */
const out = (t) => ({
  id: t.id,
  code: t.code,
  category: t.category,
  categoryLabel: SUPPORT_CATEGORIES[t.category] || t.category,
  subject: t.subject,
  status: t.status,
  astrologer: { id: t.accountId, name: store.accounts[t.accountId]?.profile.displayName || "Astrologer" },
  messages: t.messages,
  lastMessage: t.messages[t.messages.length - 1],
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
  closedAt: t.closedAt,
  canReopen: t.status !== "closed" || Date.now() - new Date(t.closedAt).getTime() < REOPEN_DAYS * TIME.DAY,
});

const byNewest = (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt);

// ---------- Astrologer side ----------

export function listMyTickets(aid) {
  return tickets()
    .filter((t) => t.accountId === aid)
    .sort(byNewest)
    .map(out);
}

export function getMyTicket(aid, ticketId) {
  const t = tickets().find((x) => x.id === ticketId && x.accountId === aid);
  if (!t) throw new SaasError("Ticket not found", "NOT_FOUND");
  return out(t);
}

export function createTicket(aid, { category, subject, message }) {
  const a = store.accounts[aid];
  if (!a) throw new SaasError("Account not found", "NOT_FOUND");
  if (!SUPPORT_CATEGORIES[category]) throw new SaasError("Please choose what the problem is about", "BAD_CATEGORY");
  const open = tickets().filter((t) => t.accountId === aid && t.status !== "closed").length;
  if (open >= SUPPORT_LIMITS.maxOpen) throw new SaasError(`You already have ${open} open tickets. Please wait for a reply or close one first.`, "TOO_MANY_OPEN");
  const at = new Date().toISOString();
  const t = {
    id: makeId("tkt"),
    code: `SUP-${(store.ticketSeq = (store.ticketSeq || 1000) + 1)}`,
    accountId: aid,
    category,
    subject: text(subject, SUPPORT_LIMITS.subject, "subject"),
    status: "open",
    messages: [{ id: makeId("msg"), from: "astrologer", name: a.profile.displayName, text: text(message, SUPPORT_LIMITS.message, "message"), at }],
    createdAt: at,
    updatedAt: at,
    closedAt: null,
  };
  tickets().unshift(t);
  return out(t);
}

export function replyAsAstrologer(aid, ticketId, message) {
  const t = tickets().find((x) => x.id === ticketId && x.accountId === aid);
  if (!t) throw new SaasError("Ticket not found", "NOT_FOUND");
  if (!out(t).canReopen) throw new SaasError("This ticket was closed more than a week ago. Please open a new one.", "TOO_OLD");
  const at = new Date().toISOString();
  t.messages.push({ id: makeId("msg"), from: "astrologer", name: store.accounts[aid].profile.displayName, text: text(message, SUPPORT_LIMITS.message, "message"), at });
  Object.assign(t, { status: "open", updatedAt: at, closedAt: null });
  return out(t);
}

export function closeMyTicket(aid, ticketId) {
  const t = tickets().find((x) => x.id === ticketId && x.accountId === aid);
  if (!t) throw new SaasError("Ticket not found", "NOT_FOUND");
  if (t.status === "closed") return out(t);
  const at = new Date().toISOString();
  Object.assign(t, { status: "closed", updatedAt: at, closedAt: at });
  return out(t);
}

/** Tickets with a reply from our team that the astrologer hasn't answered (for the menu badge). */
export function countAnswered(aid) {
  return tickets().filter((t) => t.accountId === aid && t.status === "answered").length;
}

// ---------- Admin side (Personal Consultation Admin) ----------

export function listTicketsAdmin({ status = "all", q = "" } = {}) {
  const n = String(q).trim().toLowerCase().slice(0, 60);
  const all = tickets().map(out);
  const counts = { all: all.length, open: 0, answered: 0, closed: 0 };
  all.forEach((t) => (counts[t.status] += 1));
  const items = all
    .filter((t) => status === "all" || t.status === status)
    .filter((t) => !n || [t.code, t.subject, t.astrologer.name, t.categoryLabel].some((x) => String(x).toLowerCase().includes(n)))
    .sort((a, b) => (b.status === "open") - (a.status === "open") || new Date(b.updatedAt) - new Date(a.updatedAt));
  return { items, counts };
}

export function getTicketAdmin(ticketId) {
  const t = tickets().find((x) => x.id === ticketId);
  if (!t) throw new SaasError("Ticket not found", "NOT_FOUND");
  return out(t);
}

export function replyAsAdmin(admin, ticketId, message, { close = false } = {}) {
  const t = tickets().find((x) => x.id === ticketId);
  if (!t) throw new SaasError("Ticket not found", "NOT_FOUND");
  const at = new Date().toISOString();
  const before = t.status;
  t.messages.push({ id: makeId("msg"), from: "admin", name: "Astro Kaal Chakra support", adminName: admin.name, text: text(message, SUPPORT_LIMITS.message, "reply"), at });
  Object.assign(t, close ? { status: "closed", closedAt: at } : { status: "answered", closedAt: null }, { updatedAt: at });
  audit(admin, close ? "support.reply_close" : "support.reply", { target: t.code, before, after: t.status });
  return out(t);
}

export function setTicketClosed(admin, ticketId, closed, reason) {
  const t = tickets().find((x) => x.id === ticketId);
  if (!t) throw new SaasError("Ticket not found", "NOT_FOUND");
  const r = String(reason || "").trim();
  if (r.length < 3) throw new SaasError("Please write a reason (at least 3 characters)", "REASON_REQUIRED");
  const before = t.status;
  const at = new Date().toISOString();
  Object.assign(t, closed ? { status: "closed", closedAt: at } : { status: "open", closedAt: null }, { updatedAt: at });
  audit(admin, closed ? "support.close" : "support.reopen", { target: t.code, reason: r.slice(0, 500), before, after: t.status });
  return out(t);
}
