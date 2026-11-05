"use server";

import { run } from "@/lib/action";
import { updateServices } from "@/lib/data/astro";

/** Personal-page prices (paise/min) and options. Marketplace prices are never touched. */
export async function saveServices(input) {
  const patch = {};
  for (const mode of ["chat", "audio", "video"]) {
    if (input?.[mode]) patch[mode] = { enabled: Boolean(input[mode].enabled), price: Number(input[mode].price) };
  }
  if (input?.talkNow !== undefined) patch.talkNow = Boolean(input.talkNow);
  if (input?.slotMinutes !== undefined) patch.slotMinutes = Number(input.slotMinutes);
  return run((id) => updateServices(id, patch), "/dashboard/services");
}
