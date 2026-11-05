"use client";

import { useState, useTransition } from "react";
import { MessageSquareWarning, Star, XCircle } from "lucide-react";
import { Button, ButtonLink, Field, Textarea } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { StarPicker } from "@/components/customer/Stars";
import { cancelMyBookingAction, feedbackAction } from "./actions";

/** Buttons for one booking: Join / Cancel / Rate / Tell us what happened (all re-checked on the server). */
export function BookingActions({ booking }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [dialog, setDialog] = useState(null); // "cancel" | "rate" | "missed"
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");

  const close = () => {
    if (pending) return;
    setDialog(null);
    setRating(0);
    setText("");
  };

  const cancel = () =>
    start(async () => {
      const r = await cancelMyBookingAction(booking.id);
      if (!r.ok) return toast(r.error.message, { type: "error" });
      toast("Booking cancelled. Nothing was charged.");
      close();
    });

  const send = (payload, ok) =>
    start(async () => {
      const r = await feedbackAction(payload);
      if (!r.ok) return toast(r.error.message, { type: "error" });
      toast(ok);
      setDialog(null);
      setRating(0);
      setText("");
    });

  const b = booking;
  const canRate = b.status === "completed" && b.session?.id && !b.feedbackGiven;
  const canReportMissed = b.status === "missed" && !b.feedbackGiven;

  return (
    <div className="flex flex-wrap gap-2 sm:justify-end">
      {b.canJoin && <ButtonLink href={`/session/${b.session.id}`} size="sm">Join session</ButtonLink>}
      {b.status === "upcoming" &&
        (b.canCancel ? (
          <Button size="sm" variant="outline" onClick={() => setDialog("cancel")}>
            <XCircle aria-hidden /> Cancel
          </Button>
        ) : (
          <Button size="sm" variant="outline" disabled title="Bookings can't be cancelled within 1 hour of the start time">
            Can&apos;t cancel within 1 hour
          </Button>
        ))}
      {canRate && (
        <Button size="sm" variant="soft" onClick={() => setDialog("rate")}>
          <Star aria-hidden /> Rate session
        </Button>
      )}
      {canReportMissed && (
        <Button size="sm" variant="soft" onClick={() => setDialog("missed")}>
          <MessageSquareWarning aria-hidden /> Tell us what happened
        </Button>
      )}

      <Modal open={dialog === "cancel"} onClose={close} title="Cancel this booking?" description={`${b.code} with ${b.astrologer.name}. Nothing has been charged, so nothing is refunded.`} size="sm">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={close} disabled={pending}>
            Keep booking
          </Button>
          <Button variant="danger" onClick={cancel} loading={pending}>
            Cancel booking
          </Button>
        </div>
      </Modal>

      <Modal open={dialog === "rate"} onClose={close} title={`Rate your session with ${b.astrologer.name}`} description="Your rating appears on their personal page only.">
        <div className="space-y-4">
          <StarPicker value={rating} onChange={setRating} disabled={pending} />
          <Field label="Your review (optional)" htmlFor={`rv-${b.id}`} hint={`${text.length}/500`}>
            <Textarea id={`rv-${b.id}`} value={text} maxLength={500} onChange={(e) => setText(e.target.value)} placeholder="How was the consultation?" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close} disabled={pending}>
              Later
            </Button>
            <Button onClick={() => send({ sessionId: b.session.id, rating, text }, "Thanks for your rating!")} loading={pending} disabled={!rating}>
              Submit rating
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={dialog === "missed"} onClose={close} title="The astrologer didn't join" description="You weren't charged. Tell us what happened. The astrologer and our team will see it.">
        <div className="space-y-4">
          <Field label="What happened?" htmlFor={`ms-${b.id}`} hint={`${text.length}/500`}>
            <Textarea id={`ms-${b.id}`} value={text} maxLength={500} onChange={(e) => setText(e.target.value)} placeholder="e.g. I waited but nobody joined." />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={() => send({ bookingId: b.id, text }, "Thanks, your feedback was sent.")} loading={pending} disabled={!text.trim()}>
              Send feedback
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
