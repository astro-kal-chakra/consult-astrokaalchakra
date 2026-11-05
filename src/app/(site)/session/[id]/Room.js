"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Clock4, Hourglass, PhoneOff, Send, Timer, Video, XCircle } from "lucide-react";
import { Button, ButtonLink, Card, Field, Textarea } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { StarPicker } from "@/components/customer/Stars";
import { cn } from "@/lib/cn";
import { formatTime, minutes, rupees } from "@/lib/format";
import { MODES } from "@/lib/modes";
import { endRoom, rateRoom, refreshRoom, sendRoomMessage } from "./actions";
import { CallPanel } from "./CallPanel";

const POLL_MS = 2000;

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const clock = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

/** Live room: polls the server every 2 s (demo stand-in for the socket). `role`: "customer" | "astrologer". */
export function Room({ initial, role }) {
  const [room, setRoom] = useState(initial);
  const toast = useToast();
  const isCustomer = role === "customer";
  const other = isCustomer ? room.astrologer.name : room.customer.name;
  const live = room.status === "waiting" || room.status === "active";

  useEffect(() => {
    if (!live) return;
    let stop = false;
    const t = setInterval(async () => {
      const r = await refreshRoom(room.id);
      if (stop) return;
      if (r.ok) setRoom(r.data);
      else if (r.error.code === "SIGNED_OUT") toast(r.error.message, { type: "error" });
    }, POLL_MS);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [live, room.id, toast]);

  return (
    <div className="mx-auto max-w-3xl">
      {room.status === "waiting" && <Waiting room={room} isCustomer={isCustomer} other={other} onUpdate={setRoom} />}
      {room.status === "active" && <Active room={room} isCustomer={isCustomer} other={other} onUpdate={setRoom} />}
      {room.status === "completed" && <Completed room={room} isCustomer={isCustomer} other={other} onUpdate={setRoom} />}
      {!["waiting", "active", "completed"].includes(room.status) && <Ended room={room} isCustomer={isCustomer} />}
    </div>
  );
}

function Waiting({ room, isCustomer, other, onUpdate }) {
  const now = useNow();
  const toast = useToast();
  const [pending, start] = useTransition();
  const left = Math.max(0, Math.round((new Date(room.expiresAt).getTime() - now) / 1000));
  const M = MODES[room.mode];
  const cancel = () =>
    start(async () => {
      const r = await endRoom(room.id);
      if (!r.ok) return toast(r.error.message, { type: "error" });
      onUpdate(r.data);
      toast("Request cancelled. Nothing was charged.");
    });
  return (
    <Card className="p-8 text-center">
      <span className="mx-auto flex size-16 animate-pulse items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
        <Hourglass className="size-8" aria-hidden />
      </span>
      <h1 className="mt-4 text-xl font-semibold">{isCustomer ? `Waiting for ${other} to accept` : `${other} is waiting`}</h1>
      <p className="mt-1 text-sm text-muted">
        {M.label} · {rupees(room.ratePerMin)}/min · nothing is charged until the session starts
      </p>
      <p className={cn("mt-4 text-3xl font-semibold tabular-nums", left <= 30 && "text-red-600 dark:text-red-400")} aria-live="polite">
        {clock(left)}
      </p>
      <p className="text-xs text-muted">{isCustomer ? "The astrologer has 2 minutes to accept." : "Accept from your dashboard within 2 minutes."}</p>
      {isCustomer ? (
        <Button variant="outline" className="mt-6" onClick={cancel} loading={pending}>
          <XCircle aria-hidden /> Cancel request
        </Button>
      ) : (
        <ButtonLink href="/dashboard/consultations" className="mt-6">
          Open consultations
        </ButtonLink>
      )}
    </Card>
  );
}

function Active({ room, isCustomer, other, onUpdate }) {
  const now = useNow();
  const toast = useToast();
  const [text, setText] = useState("");
  const [sending, startSend] = useTransition();
  const [ending, startEnd] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const listRef = useRef(null);
  const M = MODES[room.mode];
  const sec = Math.max(0, Math.round((now - new Date(room.startedAt).getTime()) / 1000));
  const capped = room.maxMinutes ? Math.min(sec, room.maxMinutes * 60) : sec;
  const cost = Math.round((room.ratePerMin * capped) / 60);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [room.messages.length]);

  const send = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    startSend(async () => {
      const r = await sendRoomMessage(room.id, t);
      if (!r.ok) return toast(r.error.message, { type: "error" });
      setText("");
      onUpdate(r.data);
    });
  };

  const end = () =>
    startEnd(async () => {
      const r = await endRoom(room.id);
      if (!r.ok) return toast(r.error.message, { type: "error" });
      setConfirm(false);
      onUpdate(r.data);
    });

  return (
    <Card className="flex h-[calc(100dvh-10rem)] min-h-[28rem] flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
          <M.icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{other}</p>
          <p className="text-xs text-muted">
            {M.label} · <span className="tabular-nums">{minutes(capped)}</span> · {rupees(room.ratePerMin)}/min · about{" "}
            <span className="tabular-nums">{rupees(cost, { decimals: true })}</span>
            {isCustomer ? " so far" : " earned so far"}
          </p>
          {room.maxMinutes ? (
            <p className="flex items-center gap-1 text-xs text-muted">
              <Timer className="size-3" aria-hidden /> Ends automatically at {room.maxMinutes} min
            </p>
          ) : null}
        </div>
        <Button variant="danger" size="sm" onClick={() => setConfirm(true)}>
          <PhoneOff aria-hidden /> End
        </Button>
      </div>

      {room.mode !== "chat" && <CallPanel sessionId={room.id} mode={room.mode} active={room.status === "active"} />}

      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-4" aria-live="polite">
        {room.messages.length === 0 && <p className="py-8 text-center text-sm text-muted">Say namaste to start the conversation.</p>}
        {room.messages.map((m) => (
          <div key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[80%] rounded-2xl px-3.5 py-2 text-sm", m.mine ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md bg-surface-muted")}>
              <p className="break-words whitespace-pre-wrap">{m.text}</p>
              <p className={cn("mt-0.5 text-right text-[10px]", m.mine ? "text-white/75" : "text-muted")}>{formatTime(m.at)}</p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3">
        <label htmlFor="msg" className="sr-only">
          Message
        </label>
        <textarea
          id="msg"
          rows={1}
          value={text}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) send(e);
          }}
          placeholder="Type your message…"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30 focus:outline-none"
        />
        <Button type="submit" loading={sending} disabled={!text.trim()} aria-label="Send">
          {!sending && <Send aria-hidden />}
        </Button>
      </form>

      <Modal
        open={confirm}
        onClose={() => !ending && setConfirm(false)}
        title="End this consultation?"
        description={isCustomer ? "You'll be charged per minute for the time so far from your wallet." : "The customer is charged per minute for the time so far and it goes to your earnings."}
        size="sm"
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirm(false)} disabled={ending}>
            Keep going
          </Button>
          <Button variant="danger" onClick={end} loading={ending}>
            End session
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

function Completed({ room, isCustomer, other, onUpdate }) {
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const rate = () =>
    start(async () => {
      const r = await rateRoom(room.id, rating, text);
      if (!r.ok) return toast(r.error.message, { type: "error" });
      onUpdate(r.data);
      toast("Thanks for your rating!");
    });

  return (
    <Card className="p-6 sm:p-8">
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-12 text-green-600" aria-hidden />
        <h1 className="mt-3 text-xl font-semibold">Consultation ended</h1>
        <p className="mt-1 text-sm text-muted">
          {MODES[room.mode].label} with {other}
        </p>
      </div>
      <dl className="mx-auto mt-6 max-w-sm space-y-2 rounded-xl bg-surface-muted p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Duration</dt>
          <dd className="tabular-nums">{minutes(room.durationSec)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Rate</dt>
          <dd className="tabular-nums">{rupees(room.ratePerMin)}/min</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-2 font-semibold">
          <dt>{isCustomer ? "Charged from your wallet" : "Added to your earnings"}</dt>
          <dd className="tabular-nums">{rupees(room.amount, { decimals: true })}</dd>
        </div>
      </dl>

      {isCustomer && !room.feedbackGiven && (
        <div className="mx-auto mt-6 max-w-sm space-y-3">
          <p className="text-center text-sm font-medium">How was your session?</p>
          <div className="flex justify-center">
            <StarPicker value={rating} onChange={setRating} disabled={pending} />
          </div>
          <Field label="Review (optional)" htmlFor="room-review" hint={`${text.length}/500`}>
            <Textarea id="room-review" value={text} maxLength={500} onChange={(e) => setText(e.target.value)} placeholder="Share a few words" />
          </Field>
          <Button className="w-full" onClick={rate} loading={pending} disabled={!rating}>
            Submit rating
          </Button>
        </div>
      )}
      {isCustomer && room.feedbackGiven && <p className="mt-6 text-center text-sm text-muted">Thanks, your rating was saved.</p>}

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {isCustomer ? (
          <>
            <ButtonLink href="/my/bookings" variant="outline">
              My bookings
            </ButtonLink>
            <ButtonLink href={`/${room.astrologer.slug}`} variant="ghost">
              Back to {room.astrologer.name}
            </ButtonLink>
          </>
        ) : (
          <ButtonLink href="/dashboard/consultations" variant="outline">
            Back to consultations
          </ButtonLink>
        )}
      </div>
    </Card>
  );
}

const ENDED = {
  missed: { icon: Clock4, title: "Not accepted in time", customer: "The astrologer didn't accept in 2 minutes. You haven't been charged.", astrologer: "This request expired after 2 minutes. The customer wasn't charged." },
  declined: { icon: XCircle, title: "Request declined", customer: "The astrologer couldn't take this request. You haven't been charged.", astrologer: "You declined this request. The customer wasn't charged." },
  cancelled_by_customer: { icon: XCircle, title: "Request cancelled", customer: "You cancelled this request. Nothing was charged.", astrologer: "The customer cancelled this request. Nothing was charged." },
};

function Ended({ room, isCustomer }) {
  const e = ENDED[room.status] || { icon: XCircle, title: "This consultation has ended", customer: "You haven't been charged.", astrologer: "The customer wasn't charged." };
  const Icon = e.icon;
  return (
    <Card className="p-8 text-center">
      <Icon className="mx-auto size-12 text-muted" aria-hidden />
      <h1 className="mt-3 text-xl font-semibold">{e.title}</h1>
      <p className="mt-1 text-sm text-muted">{isCustomer ? e.customer : e.astrologer}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {isCustomer ? (
          <>
            <ButtonLink href={`/${room.astrologer.slug}`}>Back to {room.astrologer.name}</ButtonLink>
            <ButtonLink href="/my/bookings" variant="outline">
              My bookings
            </ButtonLink>
          </>
        ) : (
          <Link href="/dashboard/consultations" className="text-sm font-medium text-accent hover:underline">
            Back to consultations
          </Link>
        )}
      </div>
    </Card>
  );
}
