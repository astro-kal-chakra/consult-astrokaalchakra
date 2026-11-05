"use server";

import { run } from "@/lib/action";
import { payoutBreakdown, requestPayout } from "@/lib/data/astro";

/** What the astrologer would receive for `amount` paise (TDS, GST when the yearly threshold is crossed). */
export async function previewPayout(amount) {
  return run((id) => payoutBreakdown(id, Math.max(1, Math.round(Number(amount) || 0))));
}

export async function submitPayout(amount) {
  return run((id) => requestPayout(id, amount), "/dashboard/earnings");
}
