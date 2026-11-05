"use client";

import { useState, useTransition } from "react";
import { Reply } from "lucide-react";
import { Button, Field, Textarea } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { replyAction } from "./actions";

const MAX = 500;

export function ReplyButton({ item }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(item.reply?.text || "");
  const [pending, start] = useTransition();
  const toast = useToast();
  const has = Boolean(item.reply);

  const save = (value) =>
    start(async () => {
      try {
        const r = await replyAction(item.id, value);
        if (!r.ok) return toast(r.error.message, { type: "error" });
        toast(value.trim() ? "Reply saved" : "Reply deleted");
        setOpen(false);
      } catch {
        toast("Couldn't save the reply. Please check your connection and try again.", { type: "error" });
      }
    });

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setText(item.reply?.text || "");
          setOpen(true);
        }}
      >
        <Reply aria-hidden /> {has ? "Edit reply" : "Reply"}
      </Button>
      <Modal open={open} onClose={() => !pending && setOpen(false)} title={has ? "Edit your reply" : `Reply to ${item.customer.name}`} description="Your reply is shown under this feedback on your personal page.">
        <Field label="Reply" htmlFor={`reply-${item.id}`} hint={`${text.length}/${MAX}`}>
          <Textarea id={`reply-${item.id}`} value={text} onChange={(e) => setText(e.target.value.slice(0, MAX))} maxLength={MAX} placeholder="Thank you for your feedback…" autoFocus />
        </Field>
        <div className="mt-5 flex flex-wrap justify-between gap-2">
          {has ? (
            <Button variant="ghost" className="text-red-600 dark:text-red-400" onClick={() => save("")} disabled={pending}>
              Delete reply
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={() => save(text)} loading={pending} disabled={!text.trim()}>
              Save reply
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
