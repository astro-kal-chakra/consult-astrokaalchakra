"use server";

import { runCustomer } from "@/lib/action";
import { addFeedback, cancelMyBooking } from "@/lib/data/customer-data";

/** Customer cancels a booking (only more than 1 hour before; checked on the server). */
export async function cancelMyBookingAction(bookingId) {
  return runCustomer((cid) => cancelMyBooking(cid, String(bookingId)), "/my/bookings");
}

/** Rating after a completed session, or "what happened" after a missed booking. SaaS-only feedback. */
export async function feedbackAction({ sessionId, bookingId, rating, text }) {
  return runCustomer(
    (cid) =>
      addFeedback(cid, {
        sessionId: sessionId ? String(sessionId) : undefined,
        bookingId: bookingId ? String(bookingId) : undefined,
        rating: rating === undefined || rating === null ? undefined : Number(rating),
        text: String(text || "").slice(0, 500),
      }),
    "/my/bookings",
  );
}
