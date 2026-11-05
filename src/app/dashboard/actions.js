"use server";

import { run } from "@/lib/action";
import { setPersonalEnabled, setPresence } from "@/lib/data/astro";

/** Personal service status (online / busy / offline). The marketplace status is never touched. */
export async function changePresence(presence) {
  return run((id) => setPresence(id, presence));
}

/** Master switch for personal consultations (off = page shows "not taking consultations"). */
export async function changePersonalEnabled(enabled) {
  return run((id) => setPersonalEnabled(id, enabled));
}
