"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { createTicketAction } from "./actions";

const EMPTY = { category: "", subject: "", message: "" };

/** "New ticket" button + form. `categories`: { key: label }. */
export function NewTicket({ categories, limits }) {
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(EMPTY);
  const [pending, start] = useTransition();
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const ok = v.category && v.subject.trim().length >= limits.subject[0] && v.message.trim().length >= limits.message[0];

  const submit = () =>
    start(async () => {
      try {
        const r = await createTicketAction(v);
        if (!r.ok) return toast(r.error.message, { type: "error" });
        toast(`Ticket ${r.data.code} sent. We'll reply here.`);
        setOpen(false);
        setV(EMPTY);
        router.push(`/dashboard/support/${r.data.id}`);
      } catch {
        toast("Couldn't send the ticket. Please check your connection and try again.", { type: "error" });
      }
    });

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus aria-hidden /> New ticket
      </Button>
      <Modal open={open} onClose={() => !pending && setOpen(false)} title="Contact support" description="Tell us what's wrong. Our team replies here, usually within one working day." size="lg">
        <div className="space-y-4">
          <Field label="What is it about?" htmlFor="tk-cat">
            <Select id="tk-cat" value={v.category} onChange={set("category")}>
              <option value="">Choose one</option>
              {Object.entries(categories).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Subject" htmlFor="tk-subject" hint="One line, e.g. “Payout not received”">
            <Input id="tk-subject" value={v.subject} onChange={set("subject")} maxLength={limits.subject[1]} />
          </Field>
          <Field label="Details" htmlFor="tk-msg" hint={`${v.message.trim().length}/${limits.message[1]} · booking or session codes help us find it quickly. Never share your OTP or bank password.`}>
            <Textarea id="tk-msg" rows={6} value={v.message} onChange={set("message")} maxLength={limits.message[1]} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={submit} loading={pending} disabled={!ok}>
              Send ticket
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
