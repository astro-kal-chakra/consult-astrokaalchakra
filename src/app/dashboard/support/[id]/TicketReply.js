"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Button, Card, Textarea } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { closeTicketAction, replyTicketAction } from "../actions";

/** Reply box + "Close ticket" for the astrologer. A reply re-opens an answered or recently closed ticket. */
export function TicketReply({ ticketId, status, canReply, max }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(null);

  const act = (kind, fn, done) => {
    setBusy(kind);
    start(async () => {
      try {
        const r = await fn();
        if (!r.ok) return toast(r.error.message, { type: "error" });
        done();
      } catch {
        toast("Something went wrong. Please check your connection and try again.", { type: "error" });
      } finally {
        setBusy(null);
      }
    });
  };

  const send = () =>
    act("reply", () => replyTicketAction(ticketId, text), () => {
      setText("");
      toast("Reply sent");
    });

  const close = () =>
    act("close", () => closeTicketAction(ticketId), () => {
      setConfirm(false);
      toast("Ticket closed");
    });

  if (!canReply) return <p className="mt-4 text-center text-sm text-muted">This ticket is closed. If you still need help, please open a new ticket.</p>;

  return (
    <Card className="mt-4 p-5">
      <label htmlFor="tk-reply" className="text-sm font-medium">
        {status === "closed" ? "Reply to open this ticket again" : "Your reply"}
      </label>
      <Textarea id="tk-reply" className="mt-2" rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={max} />
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        {status !== "closed" && (
          <Button variant="outline" onClick={() => setConfirm(true)} disabled={pending}>
            <CheckCircle2 aria-hidden /> My problem is solved
          </Button>
        )}
        <Button onClick={send} loading={pending && busy === "reply"} disabled={pending || text.trim().length < 2}>
          {!(pending && busy === "reply") && <Send aria-hidden />} Send reply
        </Button>
      </div>

      <Modal open={confirm} onClose={() => !pending && setConfirm(false)} title="Close this ticket?" description="Glad it's sorted. You can still reply within 7 days to open it again." size="sm">
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirm(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={close} loading={pending && busy === "close"}>
            Close ticket
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
