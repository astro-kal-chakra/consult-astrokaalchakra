/**
 * DEV-ONLY demo logins (SAAS_DEV_LOGIN=true). Every number uses OTP 123456.
 * Each one shows a different state of the subscription product so all screens can be checked.
 * Never enabled in production; real logins will use the astrologer's registered number + OTP.
 */
export const DEMO_OTP = "123456";

export const DEMO_ACCOUNTS = [
  {
    phone: "9000000001",
    id: "demo-active",
    label: "Active subscription, approved, online",
    scenario: "active",
  },
  {
    phone: "9000000002",
    id: "demo-expired",
    label: "Subscription expired (renewal message, offline)",
    scenario: "expired",
  },
  {
    phone: "9000000003",
    id: "demo-pending",
    label: "Paid, profile waiting for admin approval",
    scenario: "pending",
  },
  {
    phone: "9000000004",
    id: "demo-new",
    label: "Verified astrologer, no subscription yet",
    scenario: "new",
  },
  {
    phone: "9000000005",
    id: "demo-unverified",
    label: "Astrologer not verified yet (no access)",
    scenario: "unverified",
  },
];

/**
 * DEV-ONLY demo customers (same OTP). In production customers use their existing Astro Kaal Chakra account
 * (same number, same OTP login, same wallet).
 */
export const DEMO_CUSTOMERS = [
  { phone: "9000000009", id: "cust-priya", name: "Priya Sharma", city: "Jaipur", wallet: 150000, label: "Customer with ₹1,500 in wallet, follows + has a booking" },
  { phone: "9000000008", id: "cust-rahul", name: "Rahul Verma", city: "Lucknow", wallet: 4000, label: "Customer with only ₹40 (low balance)" },
];

export const demoByPhone = (phone) => DEMO_ACCOUNTS.find((a) => a.phone === phone) || null;
export const demoById = (id) => DEMO_ACCOUNTS.find((a) => a.id === id) || null;
export const customerByPhone = (phone) => DEMO_CUSTOMERS.find((c) => c.phone === phone) || null;
export const customerById = (id) => DEMO_CUSTOMERS.find((c) => c.id === id) || null;

/**
 * DEV-ONLY demo admins of the PERSONAL-CONSULTATION (SaaS) admin. Completely separate from the main
 * Astro Kaal Chakra admin dashboard and its accounts. Password for all: Admin@123
 */
export const DEMO_ADMIN_PASSWORD = "Admin@123";
export const DEMO_ADMINS = [
  { email: "super@consult.demo", id: "adm-super", name: "Ritika (Super admin)", role: "super_admin" },
  { email: "ops@consult.demo", id: "adm-ops", name: "Aman (Operations)", role: "operations" },
  { email: "finance@consult.demo", id: "adm-fin", name: "Neha (Finance)", role: "finance" },
  { email: "support@consult.demo", id: "adm-sup", name: "Rohan (Support, read-only)", role: "support" },
];
export const adminByEmail = (email) => DEMO_ADMINS.find((a) => a.email === String(email || "").trim().toLowerCase()) || null;
export const adminById = (id) => DEMO_ADMINS.find((a) => a.id === id) || null;
