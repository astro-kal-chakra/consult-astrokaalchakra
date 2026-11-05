import "server-only";
import { redirect } from "next/navigation";
import { getSession, requireSession } from "./session";
import { getAccount } from "@/lib/data/astro";

/**
 * Every dashboard page and action starts with this: a valid session of an ASTROLOGER who is verified.
 * (A layout alone is not enough — Next.js renders pages in parallel with their layout, so each page checks.)
 */
export async function requireAstrologer() {
  const s = await requireSession();
  if (s.role !== "astrologer") redirect("/my/bookings"); // a customer can't open the dashboard
  let account;
  try {
    account = await getAccount(s.id);
  } catch (err) {
    // Live backend: an ended session (or a deleted account) goes back through /logout to the login page
    if (["SIGNED_OUT", "TOKEN_EXPIRED", "TOKEN_INVALID", "UNAUTHORIZED", "NOT_FOUND"].includes(err?.code)) redirect("/logout");
    throw err;
  }
  if (!account.verified) redirect("/not-verified");
  return { id: s.id, account };
}

/** Customer pages / actions. Not signed in → login, then back to `next`. Astrologers are sent to their dashboard. */
export async function requireCustomer(next = "/my/bookings") {
  const s = await getSession();
  if (!s) redirect(`/login?as=customer&next=${encodeURIComponent(next)}`);
  if (s.role !== "customer") redirect("/dashboard");
  return { id: s.id };
}

/** For public pages: the signed-in customer's id, or null (astrologers / guests). */
export async function optionalCustomer() {
  const s = await getSession();
  return s?.role === "customer" ? s.id : null;
}
