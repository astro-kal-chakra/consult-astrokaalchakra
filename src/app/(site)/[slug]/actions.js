"use server";

import { optionalCustomer } from "@/lib/auth/guard";
import { runCustomer } from "@/lib/action";
import { createBooking, requestTalkNow, toggleFollow } from "@/lib/data/customer-data";

// Not signed in as a customer → { code: "LOGIN" }; the page sends the visitor to login and back.
const LOGIN = { ok: false, error: { code: "LOGIN", message: "Please sign in to continue" } };
const clean = (s) => String(s || "").replace(/[^a-z0-9-]/gi, "").slice(0, 80);

export async function followAction(slug) {
  if (!(await optionalCustomer())) return LOGIN;
  return runCustomer((cid) => toggleFollow(cid, clean(slug)), `/${clean(slug)}`);
}

export async function bookAction(slug, { mode, startsAt, minutes, concern }) {
  if (!(await optionalCustomer())) return LOGIN;
  return runCustomer((cid) => createBooking(cid, clean(slug), { mode: String(mode), startsAt: String(startsAt), minutes: Number(minutes), concern }), `/${clean(slug)}`, "/my/bookings");
}

export async function talkNowAction(slug, mode) {
  if (!(await optionalCustomer())) return LOGIN;
  return runCustomer((cid) => requestTalkNow(cid, clean(slug), String(mode)), `/${clean(slug)}`);
}
