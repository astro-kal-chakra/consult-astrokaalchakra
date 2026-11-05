"use server";

import { run } from "@/lib/action";
import { closeTicket, createTicket, replyTicket } from "@/lib/data/astro";

/** Support tickets of the signed-in astrologer (the account id comes from the session, never the browser). */
export async function createTicketAction(input) {
  const v = { category: String(input?.category || ""), subject: String(input?.subject || ""), message: String(input?.message || "") };
  return run((id) => createTicket(id, v), "/dashboard/support");
}

export async function replyTicketAction(ticketId, message) {
  return run((id) => replyTicket(id, String(ticketId), String(message || "")), "/dashboard/support", `/dashboard/support/${ticketId}`);
}

export async function closeTicketAction(ticketId) {
  return run((id) => closeTicket(id, String(ticketId)), "/dashboard/support", `/dashboard/support/${ticketId}`);
}
