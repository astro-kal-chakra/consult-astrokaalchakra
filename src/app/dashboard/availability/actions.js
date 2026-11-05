"use server";

import { run } from "@/lib/action";
import { updateAvailability } from "@/lib/data/astro";

/** Weekly hours, days off and booking window. The server checks times and overlaps. */
export async function saveAvailability(input) {
  const next = {
    weekly: input?.weekly || {},
    daysOff: Array.isArray(input?.daysOff) ? input.daysOff.map(String) : [],
    bookingWindowDays: Number(input?.bookingWindowDays),
  };
  return run((id) => updateAvailability(id, next), "/dashboard/availability");
}
