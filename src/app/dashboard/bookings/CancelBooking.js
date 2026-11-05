"use client";

import { useState, useTransition } from "react";
import { XCircle } from "lucide-react";
import { Button, Field, Textarea } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { cancelBookingAction } from "./actions";

export function CancelBooking({ booking }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();

  if (!booking.canCancel) {
    return (
      <Button size="sm" variant="outline" disabled title="Bookings can't be cancelled within 1 hour of the start time">
        Can&apos;t cancel within 1 hour
      </Button>
    );
  }

  const confirm = () =>
    start(async () => {
      try {
        const r = await cancelBookingAction(booking.id, reason);
        if (!r.ok) return toast(r.error.message, { type: "error" });
        toast(`Booking ${booking.code} cancelled. The customer is notified.`);
        setOpen(false);
        setReason("");
      } catch {
        toast("Couldn't cancel the booking. Please check your connection and try again.", { type: "error" });
      }
    });

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <XCircle aria-hidden /> Cancel
      </Button>
      <Modal open={open} onClose={() => !pending && setOpen(false)} title={`Cancel ${booking.code}?`} description={`${booking.customer.name} will be told the session is cancelled. Nothing was charged, so there is nothing to refund.`}>
        <Field label="Reason (optional)" htmlFor={`reason-${booking.id}`} hint="Shown to the customer.">
          <Textarea id={`reason-${booking.id}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="e.g. Travelling that day" />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Keep booking
          </Button>
          <Button variant="danger" onClick={confirm} loading={pending}>
            Cancel booking
          </Button>
        </div>
      </Modal>
    </>
  );
}
