"use server";

import { run } from "@/lib/action";
import { replyFeedback } from "@/lib/data/astro";

/** Save, edit or (empty text) delete the astrologer's reply. Max 500 characters. */
export async function replyAction(feedbackId, text) {
  return run((id) => replyFeedback(id, String(feedbackId), String(text ?? "")), "/dashboard/feedback");
}
