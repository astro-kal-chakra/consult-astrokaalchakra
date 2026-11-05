/**
 * Permissions of the PERSONAL-CONSULTATION (SaaS) admin — separate from the main dashboard's RBAC.
 * Each role gets actions per module: view | edit | approve. The server checks these on every page and action.
 */
export const MODULES = [
  { key: "overview", label: "Overview" },
  { key: "astrologers", label: "Astrologers & verification" },
  { key: "subscriptions", label: "Subscriptions & payments" },
  { key: "plans", label: "Plans & session limits" },
  { key: "consultations", label: "Bookings & sessions" },
  { key: "customers", label: "Customers & activity" },
  { key: "payouts", label: "Payouts" },
  { key: "feedback", label: "Feedback" },
  { key: "support", label: "Astrologer support" },
  { key: "settings", label: "Settings" },
  { key: "admins", label: "Admins & roles" },
  { key: "audit", label: "Audit log" },
];

const ALL = ["view", "edit", "approve"];

export const ROLES = {
  super_admin: {
    label: "Super admin",
    description: "Everything, including plans, payout rules and admins.",
    perms: Object.fromEntries(MODULES.map((m) => [m.key, ALL])),
  },
  operations: {
    label: "Operations",
    description: "Verifies and approves astrologers, manages their access and session limits, watches bookings and feedback.",
    perms: {
      overview: ["view"],
      astrologers: ["view", "edit", "approve"],
      subscriptions: ["view", "edit"],
      plans: ["view"],
      consultations: ["view", "edit"],
      customers: ["view"],
      payouts: ["view"],
      feedback: ["view", "edit"],
      support: ["view", "edit"],
      settings: ["view"],
      audit: ["view"],
    },
  },
  finance: {
    label: "Finance",
    description: "Subscription payments, plans and payouts.",
    perms: {
      overview: ["view"],
      astrologers: ["view"],
      subscriptions: ["view", "edit"],
      plans: ["view", "edit"],
      consultations: ["view"],
      customers: ["view"],
      payouts: ["view", "edit", "approve"],
      support: ["view"],
      settings: ["view", "edit"],
      audit: ["view"],
    },
  },
  support: {
    label: "Support",
    description: "Answers astrologer support tickets. Can look at everything needed to help, but can't change accounts, plans or money.",
    perms: {
      overview: ["view"],
      astrologers: ["view"],
      subscriptions: ["view"],
      plans: ["view"],
      consultations: ["view"],
      customers: ["view"],
      payouts: ["view"],
      feedback: ["view"],
      support: ["view", "edit"],
    },
  },
};

export const can = (role, module, action = "view") => Boolean(ROLES[role]?.perms?.[module]?.includes(action));
