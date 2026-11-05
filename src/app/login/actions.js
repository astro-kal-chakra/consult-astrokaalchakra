"use server";

import { redirect } from "next/navigation";
import { createSession, devLoginEnabled } from "@/lib/auth/session";
import { DEMO_OTP, customerByPhone, demoByPhone } from "@/lib/data/demo-accounts";
import { api, isLive } from "@/lib/backend";

const clean = (p) => String(p || "").replace(/\D/g, "").slice(-10);
/** Only same-site paths ("/raghav-sharma", "/my/bookings") — never another site. */
const safeNext = (n) => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : null);

/** Who this number belongs to. One number = one role (astrologer OR customer), like the main platform. */
function accountFor(phone) {
  const astro = demoByPhone(phone);
  if (astro) return { role: "astrologer", id: astro.id };
  const customer = customerByPhone(phone);
  if (customer) return { role: "customer", id: customer.id };
  return null;
}

/**
 * Step 1: send the OTP. DEV: demo numbers only (OTP 123456).
 * REAL (later): the existing OTP / Firebase login of AstroBackend-pg — astrologers with their registered
 * number, customers with their normal Astro Kaal Chakra account (same wallet).
 */
export async function requestOtp(_prev, formData) {
  const phone = clean(formData.get("phone"));
  const as = formData.get("as") === "customer" ? "customer" : "astrologer";
  if (!/^[6-9]\d{9}$/.test(phone)) return { step: "phone", error: "Enter your 10-digit registered mobile number." };
  if (isLive()) return liveRequestOtp(phone, as);
  if (!devLoginEnabled()) return { step: "phone", error: "Login will open once this site is connected to the live system." };
  const acc = accountFor(phone);
  if (!acc) return { step: "phone", error: "No account uses this number. Use one of the demo numbers below." };
  if (as === "customer" && acc.role === "astrologer") return { step: "phone", error: "This is an astrologer number. Astrologers sign in to the Consult Dashboard." };
  return { step: "otp", phone, info: `Demo mode: enter ${DEMO_OTP}.` };
}

/** Step 2: verify the OTP, start the session and go to `next` (or the right home for the role). */
export async function verifyOtp(_prev, formData) {
  const phone = clean(formData.get("phone"));
  const otp = String(formData.get("otp") || "").trim();
  if (isLive()) return liveVerifyOtp(phone, otp, formData);
  if (!devLoginEnabled()) return { step: "phone", error: "Login is not available yet." };
  const acc = accountFor(phone);
  if (!acc) return { step: "phone", error: "Start again with your registered number." };
  if (otp !== DEMO_OTP) return { step: "otp", phone, error: "Wrong OTP. Please try again." };
  await createSession(acc.id, acc.role);
  const next = safeNext(formData.get("next"));
  if (acc.role === "customer") redirect(next && !next.startsWith("/dashboard") ? next : "/");
  redirect("/dashboard");
}

// ---------- Live backend (SAAS_BACKEND_URL): the normal Astro Kaal Chakra OTP login ----------

async function liveRequestOtp(phone, as) {
  if (as === "customer") return liveCustomerOtp(phone);
  try {
    // Only existing astrologers: the site never sends an OTP to (or creates) a new marketplace account
    const { exists } = await api("/saas/auth/astrologer-check", { method: "POST", body: { phone }, auth: false });
    if (!exists) return { step: "phone", error: "No astrologer account uses this number. Use the number registered in the KaalChakra Astro app." };
    const sent = await api("/auth/astrologer/otp/send", { method: "POST", body: { phone }, auth: false });
    return { step: "otp", phone, info: sent?.devOtp ? `Test server: your OTP is ${sent.devOtp}.` : "We sent a 6-digit OTP to your number." };
  } catch (err) {
    return { step: "phone", error: err.message || "Couldn't send the OTP. Please try again." };
  }
}

/** Customers: their normal Astro Kaal Chakra account (same wallet); a new number signs up like in the app. */
async function liveCustomerOtp(phone) {
  try {
    const check = await api("/auth/phone-check", { method: "POST", body: { phone, role: "user" }, auth: false });
    if (check && check.allowed === false) return { step: "phone", error: check.message || "This number can't be used for a customer account." };
    const sent = await api("/auth/user/otp/send", { method: "POST", body: { phone }, auth: false });
    return { step: "otp", phone, as: "customer", info: sent?.devOtp ? `Test server: your OTP is ${sent.devOtp}.` : "We sent a 6-digit OTP to your number." };
  } catch (err) {
    return { step: "phone", error: err.message || "Couldn't send the OTP. Please try again." };
  }
}

async function liveVerifyOtp(phone, otp, formData) {
  if (!/^\d{4,8}$/.test(otp)) return { step: "otp", phone, error: "Enter the OTP you received." };
  if (formData.get("as") === "customer") return liveVerifyCustomer(phone, otp, formData);
  let r;
  try {
    r = await api("/auth/astrologer/otp/verify", { method: "POST", body: { phone, otp }, auth: false });
  } catch (err) {
    return { step: "otp", phone, error: err.message || "Wrong OTP. Please try again." };
  }
  const id = r?.astrologer?._id || r?.astrologer?.id;
  if (!r?.accessToken || !id) return { step: "phone", error: "Couldn't sign you in. Please try again." };
  await createSession(String(id), "astrologer", { accessToken: r.accessToken, refreshToken: r.refreshToken });
  redirect("/dashboard");
}

async function liveVerifyCustomer(phone, otp, formData) {
  let r;
  try {
    r = await api("/auth/user/otp/verify", { method: "POST", body: { phone, otp }, auth: false });
  } catch (err) {
    return { step: "otp", phone, as: "customer", error: err.message || "Wrong OTP. Please try again." };
  }
  const id = r?.user?._id || r?.user?.id;
  if (!r?.accessToken || !id) return { step: "phone", error: "Couldn't sign you in. Please try again." };
  await createSession(String(id), "customer", { accessToken: r.accessToken, refreshToken: r.refreshToken });
  const next = safeNext(formData.get("next"));
  redirect(next && !next.startsWith("/dashboard") ? next : "/");
}

// ---------- Firebase phone OTP (same as the main website and the apps, when the backend uses Firebase) ----------

/** Which OTP the backend uses: { firebase, firebaseProd }. Demo data / backend OTP → firebase: false. */
export async function loginConfig() {
  if (!isLive()) return { firebase: false };
  try {
    const c = await api("/auth/config", { auth: false });
    return { firebase: c?.otpProvider === "firebase", firebaseProd: Boolean(c?.firebaseProd) };
  } catch {
    return { firebase: false };
  }
}

/** Before Firebase sends an SMS: astrologers must already exist; a customer number must not be an astrologer's. */
export async function checkLoginPhone(rawPhone, as) {
  const phone = clean(rawPhone);
  if (!/^[6-9]\d{9}$/.test(phone)) return { ok: false, error: "Enter your 10-digit registered mobile number." };
  try {
    if (as === "customer") {
      const c = await api("/auth/phone-check", { method: "POST", body: { phone, role: "user" }, auth: false });
      if (c && c.allowed === false) return { ok: false, error: c.message || "This number can't be used for a customer account." };
    } else {
      const { exists } = await api("/saas/auth/astrologer-check", { method: "POST", body: { phone }, auth: false });
      if (!exists) return { ok: false, error: "No astrologer account uses this number. Use the number registered in the KaalChakra Astro app." };
    }
    return { ok: true, phone };
  } catch (err) {
    return { ok: false, error: err.message || "Please try again." };
  }
}

/** The phone number inside a Firebase ID token (only to re-check the astrologer; the backend verifies the token). */
function phoneInToken(idToken) {
  try {
    const p = JSON.parse(Buffer.from(String(idToken).split(".")[1], "base64url").toString());
    return clean(p.phone_number);
  } catch {
    return "";
  }
}

/** Firebase confirmed the OTP: the backend checks the ID token and signs the person in. */
export async function firebaseSignIn(as, idToken, rawNext) {
  const role = as === "customer" ? "customer" : "astrologer";
  if (typeof idToken !== "string" || idToken.length < 100 || idToken.length > 4096) return { ok: false, error: "Please request a new OTP." };
  if (role === "astrologer") {
    // Never create a marketplace astrologer from this site
    const check = await checkLoginPhone(phoneInToken(idToken), "astrologer");
    if (!check.ok) return check;
  }
  let r;
  try {
    r = await api(`/auth/${role === "customer" ? "user" : "astrologer"}/firebase`, { method: "POST", body: { idToken }, auth: false });
  } catch (err) {
    return { ok: false, error: err.message || "Couldn't sign you in. Please try again." };
  }
  const id = role === "customer" ? r?.user?._id || r?.user?.id : r?.astrologer?._id || r?.astrologer?.id;
  if (!r?.accessToken || !id) return { ok: false, error: "Couldn't sign you in. Please try again." };
  await createSession(String(id), role, { accessToken: r.accessToken, refreshToken: r.refreshToken });
  const next = safeNext(rawNext);
  return { ok: true, to: role === "customer" ? (next && !next.startsWith("/dashboard") ? next : "/") : "/dashboard" };
}
