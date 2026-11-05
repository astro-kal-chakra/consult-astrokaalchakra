"use server";

import { run } from "@/lib/action";
import { cancelBooking, startBooking } from "@/lib/data/astro";

/** Astrologer cancels a booking (only more than 1 hour before; the service checks again). */
export async function cancelBookingAction(bookingId, reason) {
  return run((id) => cancelBooking(id, String(bookingId), String(reason || "").trim().slice(0, 300)), "/dashboard/bookings");
}

/** Astrologer starts a booked session (10 min before → 2 min after the start time; checked on the server). */
export async function startBookingAction(bookingId) {
  return run((id) => startBooking(id, String(bookingId)), "/dashboard/bookings", "/dashboard/consultations");
}
