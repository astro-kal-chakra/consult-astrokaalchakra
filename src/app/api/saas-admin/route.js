import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { isLive } from "@/lib/backend";
import * as admin from "@/lib/data/admin";
import { SaasError, listPlans } from "@/lib/data/saas";
import { ROLES, can } from "@/lib/admin/rbac";
import * as support from "@/lib/data/support";

/**
 * Internal API for the Personal Consultation Admin, which lives in the main Astro Kaal Chakra dashboard
 * project (/saas). Stands in for the future AstroBackend-pg SaaS admin API, so both use the same demo data
 * as the astrologer dashboard and customer pages.
 *
 * POST { fn, args } with headers:
 *   x-saas-admin-key: SAAS_ADMIN_API_KEY (shared secret, server to server only)
 *   x-saas-admin:     base64 JSON { id, name, role } of the signed-in SaaS admin (for permissions + audit)
 * Only the functions below can be called, and each one re-checks the admin's role here.
 */
const FNS = {
  // reads
  getAdminOverview: { module: "overview", action: "view", run: () => admin.getAdminOverview() },
  listAstrologers: { module: "astrologers", action: "view", run: (_a, [opts]) => admin.listAstrologers(opts || {}) },
  getAstrologerAdmin: { module: "astrologers", action: "view", run: (_a, [id]) => admin.getAstrologerAdmin(String(id)) },
  listSubscriptions: { module: "subscriptions", action: "view", run: (_a, [opts]) => admin.listSubscriptions(opts || {}) },
  listPurchases: { module: "subscriptions", action: "view", run: (_a, [opts]) => admin.listPurchases(opts || {}) },
  listPlans: { module: "plans", action: "view", run: () => listPlans({ all: true }) },
  listAllBookings: { module: "consultations", action: "view", run: (_a, [opts]) => admin.listAllBookings(opts || {}) },
  listAllSessions: { module: "consultations", action: "view", run: (_a, [opts]) => admin.listAllSessions(opts || {}) },
  listAllPayouts: { module: "payouts", action: "view", run: (_a, [opts]) => admin.listAllPayouts(opts || {}) },
  listAllFeedback: { module: "feedback", action: "view", run: (_a, [opts]) => admin.listAllFeedback(opts || {}) },
  getSettingsAdmin: { module: "settings", action: "view", run: () => admin.getSettingsAdmin() },
  listAudit: { module: "audit", action: "view", run: (_a, [opts]) => admin.listAudit(opts || {}) },
  listCustomers: { module: "customers", action: "view", run: (_a, [opts]) => admin.listCustomers(opts || {}) },
  getCustomerAdmin: { module: "customers", action: "view", run: (_a, [id]) => admin.getCustomerAdmin(String(id)) },
  getActivity: { module: "overview", action: "view", run: () => admin.getActivity() },
  listTickets: { module: "support", action: "view", run: (_a, [opts]) => support.listTicketsAdmin(opts || {}) },
  getTicket: { module: "support", action: "view", run: (_a, [id]) => support.getTicketAdmin(String(id)) },
  // changes (each writes the audit log)
  approveProfile: { module: "astrologers", action: "approve", run: (a, [id, note]) => admin.approveProfile(a, String(id), note) },
  rejectProfile: { module: "astrologers", action: "approve", run: (a, [id, reason]) => admin.rejectProfile(a, String(id), reason) },
  setSuspended: { module: "astrologers", action: "edit", run: (a, [id, on, reason]) => admin.setSuspended(a, String(id), Boolean(on), reason) },
  grantSessions: { module: "astrologers", action: "edit", run: (a, [id, mode, count, reason]) => admin.grantSessions(a, String(id), String(mode), count, reason) },
  extendSubscription: { module: "subscriptions", action: "edit", run: (a, [id, days, reason]) => admin.extendSubscription(a, String(id), days, reason) },
  updatePlan: { module: "plans", action: "edit", run: (a, [planId, patch]) => admin.updatePlan(a, String(planId), patch || {}) },
  approvePayout: { module: "payouts", action: "approve", run: (a, [id]) => admin.approvePayout(a, String(id)) },
  rejectPayout: { module: "payouts", action: "approve", run: (a, [id, reason]) => admin.rejectPayout(a, String(id), reason) },
  markPayoutPaid: { module: "payouts", action: "edit", run: (a, [id, utr]) => admin.markPayoutPaid(a, String(id), utr) },
  setFeedbackHidden: { module: "feedback", action: "edit", run: (a, [id, hidden, reason]) => admin.setFeedbackHidden(a, String(id), Boolean(hidden), reason) },
  updatePayoutRules: { module: "settings", action: "edit", run: (a, [patch]) => admin.updatePayoutRules(a, patch || {}) },
  createPlan: { module: "plans", action: "edit", run: (a, [input]) => admin.createPlan(a, input || {}) },
  assignSubscription: { module: "subscriptions", action: "edit", run: (a, [id, input]) => admin.assignSubscription(a, String(id), input || {}) },
  updateAstrologerProfile: { module: "astrologers", action: "edit", run: (a, [id, patch, reason]) => admin.updateAstrologerProfile(a, String(id), patch || {}, reason) },
  updateAstrologerServices: { module: "astrologers", action: "edit", run: (a, [id, patch, reason]) => admin.updateAstrologerServices(a, String(id), patch || {}, reason) },
  updateAstrologerAvailability: { module: "astrologers", action: "edit", run: (a, [id, next, reason]) => admin.updateAstrologerAvailability(a, String(id), next || {}, reason) },
  setPersonalEnabledAdmin: { module: "astrologers", action: "edit", run: (a, [id, on, reason]) => admin.setPersonalEnabledAdmin(a, String(id), Boolean(on), reason) },
  forceOffline: { module: "astrologers", action: "edit", run: (a, [id, reason]) => admin.forceOffline(a, String(id), reason) },
  replyTicket: { module: "support", action: "edit", run: (a, [id, message, close]) => support.replyAsAdmin(a, String(id), String(message || ""), { close: Boolean(close) }) },
  setTicketClosed: { module: "support", action: "edit", run: (a, [id, closed, reason]) => support.setTicketClosed(a, String(id), Boolean(closed), reason) },
};

const sameKey = (given) => {
  const key = process.env.SAAS_ADMIN_API_KEY;
  if (!key || key.length < 16 || !given) return false;
  const x = Buffer.from(String(given));
  const y = Buffer.from(key);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const fail = (status, code, message) => NextResponse.json({ ok: false, error: { code, message } }, { status });

export async function POST(request) {
  // Demo bridge only: with the live backend the admin talks to the backend, and this endpoint does not exist
  if (isLive()) return fail(404, "NOT_FOUND", "Not found");
  if (!sameKey(request.headers.get("x-saas-admin-key"))) return fail(401, "UNAUTHORIZED", "Not allowed");
  let who;
  try {
    who = JSON.parse(Buffer.from(request.headers.get("x-saas-admin") || "", "base64").toString());
  } catch {
    return fail(400, "BAD_ADMIN", "Missing admin");
  }
  if (!who?.id || !ROLES[who.role]) return fail(400, "BAD_ADMIN", "Missing admin");
  const body = await request.json().catch(() => null);
  const def = body && FNS[body.fn];
  if (!def) return fail(404, "UNKNOWN_FN", "Unknown function");
  if (!can(who.role, def.module, def.action)) return fail(403, "FORBIDDEN", "You don't have permission to do this.");
  try {
    const data = await def.run({ id: String(who.id), name: String(who.name || "Admin").slice(0, 80), role: who.role }, Array.isArray(body.args) ? body.args : []);
    return NextResponse.json({ ok: true, data: data === undefined ? null : data });
  } catch (err) {
    if (err instanceof SaasError) return NextResponse.json({ ok: false, error: { code: err.code, message: err.message } }, { status: 200 });
    console.error("[saas-admin api]", err);
    return fail(500, "SERVER_ERROR", "Something went wrong");
  }
}
