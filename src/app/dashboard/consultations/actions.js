"use server";

import { run } from "@/lib/action";
import { acceptSession, declineSession, endSession } from "@/lib/data/astro";

const PATH = "/dashboard/consultations";

export async function acceptAction(sessionId) {
  return run((id) => acceptSession(id, String(sessionId)), PATH);
}

export async function declineAction(sessionId) {
  return run((id) => declineSession(id, String(sessionId)), PATH);
}

export async function endAction(sessionId) {
  return run((id) => endSession(id, String(sessionId)), PATH, "/dashboard/earnings");
}
