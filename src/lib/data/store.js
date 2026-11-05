import "server-only";
import { DEMO_ACCOUNTS, DEMO_CUSTOMERS } from "./demo-accounts";

/**
 * In-memory demo data for the personal (SaaS) dashboard, used while NEXT_PUBLIC_API_URL is empty.
 * One record set per demo account, seeded relative to "now" so dates always look current.
 * Kept on globalThis so it survives hot reloads in `next dev`. Restarting the dev server resets it.
 *
 * Shapes here are the contract the real SaaS API (AstroBackend-pg, PostgreSQL) will return.
 * Money is integer paise. Dates are ISO strings.
 */

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const iso = (ms) => new Date(ms).toISOString();

/**
 * Subscription plans — set by the SaaS admin (prices / limits here are placeholders until the admin sets them).
 * NOTHING is unlimited: every plan has a fixed number of chat, voice and video sessions per period and a
 * maximum length per session (calls cost us per minute). Video is the most expensive, so it gets the fewest.
 * Unused sessions don't carry over to the next period.
 */
const COMMON = ["Personal consultation page", "Own prices & availability", "Bookings, followers & feedback", "Earnings dashboard & payouts"];
const PLANS = [
  { id: "plan-starter-1m", name: "Starter", months: 1, price: 99900, gstPercent: 18, limits: { chat: 50, audio: 30, video: 10 }, maxSessionMinutes: 30, features: COMMON },
  { id: "plan-growth-1m", name: "Growth", months: 1, price: 179900, gstPercent: 18, limits: { chat: 100, audio: 60, video: 25 }, maxSessionMinutes: 45, badge: "Popular", features: COMMON },
  { id: "plan-pro-1m", name: "Pro", months: 1, price: 299900, gstPercent: 18, limits: { chat: 200, audio: 120, video: 50 }, maxSessionMinutes: 60, features: COMMON },
  { id: "plan-starter-3m", name: "Starter Quarterly", months: 3, price: 269900, gstPercent: 18, limits: { chat: 150, audio: 90, video: 30 }, maxSessionMinutes: 30, badge: "Save 10%", features: COMMON },
  { id: "plan-growth-3m", name: "Growth Quarterly", months: 3, price: 479900, gstPercent: 18, limits: { chat: 300, audio: 180, video: 75 }, maxSessionMinutes: 45, badge: "Save 11%", features: COMMON },
  { id: "plan-pro-3m", name: "Pro Quarterly", months: 3, price: 799900, gstPercent: 18, limits: { chat: 600, audio: 360, video: 150 }, maxSessionMinutes: 60, badge: "Best value", features: COMMON },
];

/** Payout rules for SaaS earnings (no marketplace commission). Set by the SaaS admin. */
const PAYOUT_RULES = { tdsPercent: 1, gstPercent: 18, gstThresholdFy: 500000, minPayout: 50000 };

const CUSTOMERS = [
  "Priya Sharma", "Rahul Verma", "Anjali Gupta", "Vikram Singh", "Neha Joshi", "Arjun Mehta", "Kavya Nair",
  "Rohit Bansal", "Sneha Iyer", "Aditya Rao", "Pooja Patel", "Karan Malhotra", "Divya Reddy", "Manish Agarwal",
];
const CITIES = ["Jaipur", "Delhi", "Mumbai", "Pune", "Bengaluru", "Lucknow", "Indore", "Ahmedabad", "Chandigarh", "Kolkata"];

let seq = 1000;
const nextId = (p) => `${p}-${++seq}`;

function weekly() {
  const morning = { from: "10:00", to: "13:00" };
  const evening = { from: "17:00", to: "21:00" };
  return { mon: [morning, evening], tue: [morning, evening], wed: [morning], thu: [morning, evening], fri: [morning, evening], sat: [evening], sun: [] };
}

function seedAccount(demo, now) {
  const scenario = demo.scenario;
  const name = demo.name || { active: "Acharya Raghav Sharma", expired: "Pandit Mohan Tiwari", pending: "Jyotishi Sunita Devi", new: "Acharya Kiran Joshi", unverified: "Ravi Kumar" }[scenario];
  const slug = name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/(^-|-$)/g, "");

  const account = {
    id: demo.id,
    phone: demo.phone,
    name,
    slug,
    verified: scenario !== "unverified",
    saasStatus: "active", // active | suspended
    personalEnabled: scenario === "active" || scenario === "expired",
    presence: demo.presence || (scenario === "active" ? "online" : "offline"), // online | busy | offline (personal service only)
    profileApproval:
      scenario === "active" || scenario === "expired"
        ? { status: "approved", submittedAt: iso(now - 40 * DAY), reviewedAt: iso(now - 39 * DAY), note: null }
        : scenario === "pending"
          ? { status: "pending", submittedAt: iso(now - 1 * DAY), reviewedAt: null, note: null }
          : { status: "draft", submittedAt: null, reviewedAt: null, note: null },
  };

  const profile = {
    displayName: name,
    headline: scenario === "new" ? "" : "Vedic astrologer · Career, marriage & finance",
    bio: scenario === "new" ? "" : "15+ years guiding people through Vedic astrology, Lal Kitab remedies and Prashna. Calm, practical advice for career, marriage and money questions.",
    photoUrl: null,
    experienceYears: scenario === "new" ? 0 : 15,
    languages: ["Hindi", "English"],
    expertise: scenario === "new" ? [] : ["Vedic", "Lal Kitab", "Prashna", "Kundli matching"],
    city: "Jaipur",
    ...(demo.profile || {}),
  };

  const services = {
    chat: { enabled: true, price: 5000 },
    audio: { enabled: true, price: 6000 },
    video: { enabled: scenario === "active", price: 8000 },
    talkNow: scenario === "active",
    ...(demo.services || {}),
    slotMinutes: 30,
    bufferMinutes: 10,
  };

  const availability = { timezone: "Asia/Kolkata", weekly: weekly(), daysOff: [iso(now + 5 * DAY).slice(0, 10)], bookingWindowDays: 14 };

  // Subscription periods (each paid purchase = one period). Status is derived from dates (see saas.js).
  const purchases = [];
  const periods = [];
  const addPeriod = (planId, startsAt, paidAt) => {
    const plan = PLANS.find((p) => p.id === planId);
    const gst = Math.round((plan.price * plan.gstPercent) / 100);
    const purchase = { id: nextId("pur"), code: `SUB-${seq}`, planId, planName: plan.name, amount: plan.price, gst, total: plan.price + gst, status: "paid", razorpayPaymentId: `pay_demo${seq}`, paidAt: iso(paidAt), invoiceNo: `KC/SAAS/${seq}` };
    const end = new Date(startsAt);
    end.setMonth(end.getMonth() + plan.months);
    const period = { id: nextId("per"), planId, planName: plan.name, limits: { ...plan.limits }, maxSessionMinutes: plan.maxSessionMinutes, startsAt: iso(startsAt), endsAt: end.toISOString(), purchaseId: purchase.id };
    purchase.periodId = period.id;
    purchases.push(purchase);
    periods.push(period);
  };
  if (scenario === "active") {
    addPeriod("plan-starter-1m", now - 18 * DAY, now - 18 * DAY);
    const firstEnd = new Date(periods[0].endsAt).getTime();
    addPeriod("plan-growth-3m", firstEnd, now - 2 * DAY); // prepaid, queued: starts when the current one ends
  } else if (scenario === "expired") {
    addPeriod("plan-starter-1m", now - 75 * DAY, now - 75 * DAY);
    addPeriod("plan-starter-1m", new Date(periods[0].endsAt).getTime(), now - 45 * DAY);
  } else if (scenario === "pending") {
    addPeriod("plan-growth-1m", now - 1 * DAY, now - 1 * DAY);
  }
  if (scenario === "active" || scenario === "expired") {
    purchases.push({ id: nextId("pur"), code: `SUB-${seq}`, planId: "plan-starter-1m", planName: "Starter", amount: 99900, gst: 17982, total: 117882, status: "failed", razorpayPaymentId: null, paidAt: iso(now - 20 * DAY), failureReason: "Payment cancelled by user" });
  }

  const hasHistory = scenario === "active" || scenario === "expired";
  const pick = (i) => CUSTOMERS[i % CUSTOMERS.length];

  // Bookings: scheduled personal consultations (nothing charged until the session happens)
  const bookings = [];
  if (hasHistory) {
    const add = (i, mode, startMs, mins, status, extra = {}) =>
      bookings.push({
        id: nextId("bk"),
        code: `BK-${seq}`,
        customer: { name: pick(i), city: CITIES[i % CITIES.length] },
        mode,
        scheduledAt: iso(startMs),
        durationMinutes: mins,
        ratePerMin: services[mode].price,
        status,
        amountCharged: status === "completed" ? services[mode].price * mins : 0,
        concern: ["Career change next year?", "Marriage timing", "Business partnership", "Health of parents", "Foreign settlement"][i % 5],
        createdAt: iso(startMs - 2 * DAY),
        ...extra,
      });
    if (scenario === "active") {
      add(0, "chat", now + 50 * MIN, 30, "upcoming");
      add(1, "audio", now + 3 * HOUR, 30, "upcoming");
      add(2, "video", now + 26 * HOUR, 45, "upcoming");
      add(3, "chat", now + 3 * DAY, 30, "upcoming");
    } else {
      add(0, "chat", now - 2 * DAY, 30, "expired_not_attempted", { note: "Subscription expired before this session" });
      add(1, "audio", now + 1 * DAY, 30, "expired_not_attempted", { note: "Subscription expired before this session" });
    }
    add(4, "chat", now - 1 * DAY, 30, "completed");
    if (scenario === "active" && !demo.showcase) {
      // Demo customer Priya (9000000009): one upcoming and one completed booking with this astrologer
      const priya = { id: "cust-priya", name: "Priya Sharma", city: "Jaipur" };
      bookings[0].customer = priya;
      bookings[bookings.length - 1].customer = priya;
    }
    add(5, "audio", now - 2 * DAY, 15, "completed");
    add(6, "video", now - 4 * DAY, 30, "completed");
    add(7, "chat", now - 5 * DAY, 30, "missed");
    add(8, "audio", now - 6 * DAY, 30, "cancelled_by_customer", { cancelledAt: iso(now - 7 * DAY) });
    add(9, "chat", now - 8 * DAY, 30, "cancelled_by_astrologer", { cancelledAt: iso(now - 9 * DAY), cancelReason: "Travelling" });
    add(10, "chat", now - 10 * DAY, 45, "completed");
  }

  // Consultation sessions (scheduled + talk-now). Billing per minute from the customer's wallet, like today.
  const sessions = [];
  if (hasHistory) {
    bookings
      .filter((b) => b.status === "completed")
      .forEach((b, i) => {
        const dur = b.durationMinutes * 60 - (i % 3) * 37;
        const amount = Math.round((b.ratePerMin * dur) / 60);
        b.amountCharged = amount;
        sessions.push({ id: nextId("ses"), code: `PS-${seq}`, bookingId: b.id, type: "scheduled", customer: b.customer, mode: b.mode, startedAt: b.scheduledAt, endedAt: iso(new Date(b.scheduledAt).getTime() + dur * 1000), durationSec: dur, ratePerMin: b.ratePerMin, amount, status: "completed" });
      });
    [
      [11, "chat", 3 * HOUR, 640],
      [12, "audio", 26 * HOUR, 905],
      [13, "chat", 50 * HOUR, 410],
    ].forEach(([i, mode, ago, dur]) => {
      const amount = Math.round((services[mode].price * dur) / 60);
      sessions.push({ id: nextId("ses"), code: `PS-${seq}`, bookingId: null, type: "talk_now", customer: { name: pick(i), city: CITIES[i % CITIES.length] }, mode, startedAt: iso(now - ago), endedAt: iso(now - ago + dur * 1000), durationSec: dur, ratePerMin: services[mode].price, amount, status: "completed" });
    });
    if (scenario === "active" && !demo.showcase) {
      const periodStart = new Date(periods[0].startsAt).getTime();
      const used = sessions.filter((s) => s.mode === "video" && new Date(s.startedAt).getTime() >= periodStart).length;
      for (let i = 0; i < Math.max(0, 10 - used); i++) {
        const startMs = periodStart + (i + 1) * 30 * HOUR;
        const dur = 900 + i * 60;
        const amount = Math.round((services.video.price * dur) / 60);
        sessions.push({ id: nextId("ses"), code: `PS-${seq}`, bookingId: null, type: "talk_now", customer: { name: pick(i + 2), city: CITIES[(i + 4) % CITIES.length] }, mode: "video", startedAt: iso(startMs), endedAt: iso(startMs + dur * 1000), durationSec: dur, ratePerMin: services.video.price, amount, status: "completed" });
      }
    }
    const missed = bookings.find((b) => b.status === "missed");
    sessions.push({ id: nextId("ses"), code: `PS-${seq}`, bookingId: missed.id, type: "scheduled", customer: missed.customer, mode: missed.mode, startedAt: null, endedAt: null, durationSec: 0, ratePerMin: missed.ratePerMin, amount: 0, status: "missed", expiredAt: iso(new Date(missed.scheduledAt).getTime() + 2 * MIN) });
    if (scenario === "active" && !demo.showcase) {
      sessions.unshift({ id: nextId("ses"), code: `PS-${seq}`, bookingId: null, type: "talk_now", customer: { name: "Meera Kapoor", city: "Delhi" }, mode: "chat", startedAt: null, endedAt: null, durationSec: 0, ratePerMin: services.chat.price, amount: 0, status: "waiting", requestedAt: iso(now - 25 * 1000), expiresAt: iso(now + 95 * 1000) });
    }
  }

  // Followers of the personal page only (marketplace followers are separate)
  const followers = hasHistory
    ? Array.from({ length: scenario === "active" ? 23 : 9 }, (_, i) => ({ id: nextId("fol"), name: pick(i + 3), city: CITIES[(i * 3) % CITIES.length], followedAt: iso(now - (i * 2 + 1) * DAY - i * HOUR) }))
    : [];
  if (scenario === "active" && !demo.showcase) followers.unshift({ id: nextId("fol"), customerId: "cust-priya", name: "Priya Sharma", city: "Jaipur", followedAt: iso(now - 6 * HOUR) });

  // Feedback (SaaS only): reviews after sessions + feedback on missed sessions
  const feedback = [];
  if (hasHistory) {
    const done = sessions.filter((s) => s.status === "completed");
    const texts = ["Very clear and practical guidance. Thank you!", "Accurate reading about my career, will consult again.", "Calm and patient, explained the remedies well.", "Good session, but felt a bit rushed.", "Excellent! Predictions about job change matched."];
    done.slice(0, 5).forEach((s, i) =>
      feedback.push({ id: nextId("fb"), kind: "review", rating: [5, 5, 4, 3, 5][i], text: texts[i], customer: s.customer, sessionCode: s.code, mode: s.mode, createdAt: iso(new Date(s.endedAt).getTime() + 20 * MIN), reply: i === 0 ? { text: "Thank you for your kind words. Blessings!", at: iso(new Date(s.endedAt).getTime() + 3 * HOUR) } : null }),
    );
    const missed = bookings.find((b) => b.status === "missed");
    feedback.push({ id: nextId("fb"), kind: "missed_session", rating: null, text: "Astrologer did not join at the booked time. Please reschedule.", customer: missed.customer, sessionCode: missed.code, mode: missed.mode, createdAt: iso(new Date(missed.scheduledAt).getTime() + 10 * MIN), reply: null });
  }

  // SaaS earnings ledger: credits from sessions, debits for payouts. No marketplace commission.
  const ledger = [];
  const payouts = [];
  if (hasHistory) {
    sessions
      .filter((s) => s.status === "completed")
      .forEach((s) => ledger.push({ id: nextId("led"), type: "credit", category: "session", amount: s.amount, description: `${s.mode === "audio" ? "Voice" : s.mode === "video" ? "Video" : "Chat"} consultation · ${s.customer.name}`, ref: s.code, createdAt: s.endedAt }));
    ledger.push({ id: nextId("led"), type: "credit", category: "session", amount: 420000, description: "Earlier consultations (last month)", ref: "PS-0999", createdAt: iso(now - 32 * DAY) });
    const paid = 300000;
    const gstApplies = true;
    const tds = Math.round((paid * PAYOUT_RULES.tdsPercent) / 100);
    const gst = gstApplies ? Math.round((paid * PAYOUT_RULES.gstPercent) / 100) : 0;
    payouts.push({ id: nextId("po"), code: `SPO-${seq}`, amount: paid, tds, gst, net: paid - tds - gst, status: "paid", requestedAt: iso(now - 25 * DAY), paidAt: iso(now - 23 * DAY), utr: "UTR4417822931", method: "bank" });
    ledger.push({ id: nextId("led"), type: "debit", category: "payout", amount: paid, description: "Payout SPO", ref: payouts[0].code, createdAt: payouts[0].requestedAt });
    if (demo.showcase && demo.id === "demo-show-1") {
      // A payout waiting for the SaaS admin (Payouts → Requested)
      payouts.push({ id: nextId("po"), code: `SPO-${seq}`, amount: 120000, tds: 1200, gst: 21600, net: 97200, status: "requested", requestedAt: iso(now - 5 * HOUR), method: "bank" });
      ledger.push({ id: nextId("led"), type: "debit", category: "payout", amount: 120000, description: "Payout request", ref: payouts[payouts.length - 1].code, createdAt: iso(now - 5 * HOUR) });
    }
    if (scenario === "active" && !demo.showcase) {
      payouts.push({ id: nextId("po"), code: `SPO-${seq}`, amount: 50000, tds: 500, gst: 9000, net: 40500, status: "rejected", requestedAt: iso(now - 12 * DAY), reviewedAt: iso(now - 11 * DAY), remarks: "Bank account name did not match" });
    }
  }

  const kundali = hasHistory
    ? [
        { id: nextId("kd"), name: "Priya Sharma", gender: "female", dob: "1994-03-12", tob: "06:45", place: "Jaipur", region: "Rajasthan, India", lat: 26.91, lng: 75.79, tz: "Asia/Kolkata", createdAt: iso(now - 3 * DAY), forBooking: bookings[0]?.code || null },
        { id: nextId("kd"), name: "Rahul Verma", gender: "male", dob: "1989-11-02", tob: "21:10", place: "Lucknow", region: "Uttar Pradesh, India", lat: 26.85, lng: 80.95, tz: "Asia/Kolkata", createdAt: iso(now - 9 * DAY), forBooking: null },
      ]
    : [];

  const settings = {
    notifications: { newBooking: true, cancellations: true, reminders: true, payouts: true, feedback: true },
    reminderMinutes: [1440, 60, 10],
    payoutMethod: { type: "bank", holder: name, accountMasked: "XXXXXX4821", ifsc: "HDFC0001234", verified: true },
  };

  return { account, profile, services, availability, purchases, periods, bookings, sessions, followers, feedback, ledger, payouts, kundali, settings };
}

/**
 * Extra live astrologers (no demo login) so the customer side has "similar astrologers" to show.
 * They behave like the active demo astrologer: verified, subscribed, approved, personal page live.
 */
const SHOWCASE = [
  {
    id: "demo-show-1",
    scenario: "active",
    showcase: true,
    name: "Jyotishi Meera Iyer",
    presence: "online",
    profile: { headline: "Vedic & KP astrologer · Marriage and relationships", bio: "12 years of Vedic and KP astrology focused on marriage timing, compatibility and family matters. Gentle, clear guidance with simple remedies.", experienceYears: 12, languages: ["English", "Tamil", "Hindi"], expertise: ["Vedic", "KP", "Kundli matching", "Prashna"], city: "Chennai" },
    services: { chat: { enabled: true, price: 4000 }, audio: { enabled: true, price: 5500 }, video: { enabled: true, price: 7000 } },
  },
  {
    id: "demo-show-2",
    scenario: "active",
    showcase: true,
    name: "Pandit Arvind Mishra",
    presence: "busy",
    profile: { headline: "Lal Kitab & Vastu · Career and business", bio: "20+ years with Lal Kitab and Vastu for career growth, business decisions and property. Practical remedies that fit everyday life.", experienceYears: 22, languages: ["Hindi", "English"], expertise: ["Lal Kitab", "Vastu", "Vedic", "Numerology"], city: "Varanasi" },
    services: { chat: { enabled: true, price: 6000 }, audio: { enabled: true, price: 7500 }, video: { enabled: false, price: 9000 } },
  },
  {
    id: "demo-show-3",
    scenario: "active",
    showcase: true,
    name: "Acharya Neha Kulkarni",
    presence: "offline",
    profile: { headline: "Tarot & Numerology · Quick, clear answers", bio: "Tarot reader and numerologist for 8 years. Short, focused sessions for decisions about career, love and timing.", experienceYears: 8, languages: ["Marathi", "Hindi", "English"], expertise: ["Tarot", "Numerology", "Prashna"], city: "Pune" },
    services: { chat: { enabled: true, price: 3000 }, audio: { enabled: true, price: 4500 }, video: { enabled: false, price: 6000 } },
  },
];

function seedAll() {
  const now = Date.now();
  return Object.fromEntries([...DEMO_ACCOUNTS, ...SHOWCASE.map((s, i) => ({ ...s, phone: `90000001${i}0` }))].map((d) => [d.id, seedAccount(d, now)]));
}

/** Demo customers: the SAME wallet they use on the marketplace (real: AstroBackend-pg wallet service). */
function seedCustomers() {
  return Object.fromEntries(
    DEMO_CUSTOMERS.map((c) => [c.id, { id: c.id, phone: c.phone, name: c.name, city: c.city, wallet: { balance: c.wallet }, transactions: [] }]),
  );
}

// Bump when the demo data's shape changes: a running dev server then reseeds instead of keeping old data
// from before the change (hot reload keeps globalThis). 2 = plan limits, 3 = customers, 4 = showcase, 5 = admin.
const STORE_VERSION = 5;

const g = globalThis;
if (g.__kcSaasStore?.version !== STORE_VERSION) g.__kcSaasStore = { version: STORE_VERSION, accounts: seedAll(), customers: seedCustomers(), plans: PLANS, payoutRules: PAYOUT_RULES, audit: [] };

export const store = g.__kcSaasStore;
export const makeId = nextId;
export const TIME = { MIN, HOUR, DAY };
