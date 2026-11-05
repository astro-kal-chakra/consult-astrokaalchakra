"use server";

import { run } from "@/lib/action";
import { setPersonalEnabled, updateSettings } from "@/lib/data/astro";

const KEYS = ["newBooking", "cancellations", "reminders", "payouts", "feedback"];

/** Master switch: off = the page stays visible but takes no bookings, and the personal service goes offline. */
export async function savePersonalEnabled(enabled) {
  return run((id) => setPersonalEnabled(id, Boolean(enabled)), "/dashboard/settings");
}

export async function saveNotifications(input) {
  const notifications = Object.fromEntries(KEYS.filter((k) => input?.[k] !== undefined).map((k) => [k, Boolean(input[k])]));
  return run((id) => updateSettings(id, { notifications }), "/dashboard/settings");
}
