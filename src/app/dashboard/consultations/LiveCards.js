"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Radio, X } from "lucide-react";
import { Button, ButtonLink, Card } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { minutes, rupees } from "@/lib/format";
import { MODES } from "@/lib/modes";
import { acceptAction, declineAction, endAction } from "./actions";

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/**
 * Best guess of the server's clock: `serverNow` is when the server rendered the page (it changes on every refresh),
 * plus the time passed on this device since then. Countdowns use it, so a device clock that is ahead or behind
 * doesn't make a request look expired (or a session look longer) than it is.
 */
function useServerNow(serverNow) {
  const now = useNow();
  const [anchor, setAnchor] = useState({ server: serverNow, client: now });
  if (anchor.server !== serverNow) setAnchor({ server: serverNow, client: now });
  const a = anchor.server === serverNow ? anchor : { server: serverNow, client: now };
  return a.server + Math.max(0, now - a.client);
}

/** Talk-now request: 2 minutes to accept, then it expires (nothing charged). */
/** `limitReached`: this consultation type has no sessions left in the plan (Accept is blocked on the server too). */
export function WaitingCard({ s, canConsult, limitReached = false, serverNow }) {
  const now = useServerNow(serverNow);
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const left = Math.max(0, Math.round((new Date(s.expiresAt).getTime() - now) / 1000));
  const expired = left === 0;
  const M = MODES[s.mode];

  useEffect(() => {
    if (expired) router.refresh(); // the server marks it missed
  }, [expired, router]);

  const act = (fn, ok) =>
    start(async () => {
      try {
        const r = await fn(s.id);
        if (!r.ok) {
          toast(r.error.message, { type: "error" });
          router.refresh();
        } else toast(ok);
      } catch {
        toast("Couldn't reach the server. Please check your connection and try again.", { type: "error" });
      }
    });

  return (
    <Card className="flex flex-col gap-3 border-brand-300 p-4 sm:flex-row sm:items-center dark:border-brand-800">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
        <M.icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {s.customer.name} <span className="text-xs font-normal text-muted">{s.customer.city}</span>
        </p>
        <p className="text-sm text-muted">
          Talk now · {M.label} · {rupees(s.ratePerMin)}/min
        </p>
        {limitReached && <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{M.label} limit for your plan is used up, so you can decline this request.</p>}
      </div>
      <p className={`text-sm font-semibold tabular-nums ${left <= 30 ? "text-red-600 dark:text-red-400" : ""}`} aria-live="polite">
        {expired ? "Expired" : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")} left`}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => act(declineAction, "Request declined")} disabled={expired} loading={pending}>
          <X aria-hidden /> Decline
        </Button>
        <Button size="sm" onClick={() => act(acceptAction, "Consultation started")} disabled={expired || !canConsult || limitReached} loading={pending}>
          <Check aria-hidden /> Accept
        </Button>
      </div>
    </Card>
  );
}

/** A consultation in progress. "Open session" goes to the shared session room (/session/<id>). */
export function ActiveCard({ s, serverNow }) {
  const now = useServerNow(serverNow);
  const toast = useToast();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const M = MODES[s.mode];
  const sec = Math.max(0, Math.round((now - new Date(s.startedAt).getTime()) / 1000));

  const end = () =>
    start(async () => {
      try {
        const r = await endAction(s.id);
        if (!r.ok) return toast(r.error.message, { type: "error" });
        toast(`Consultation ended · ${rupees(r.data.amount, { decimals: true })} added to your earnings`);
        setConfirm(false);
      } catch {
        toast("Couldn't end the session. Please check your connection and try again.", { type: "error" });
      }
    });

  return (
    <Card className="flex flex-col gap-3 border-green-300 p-4 sm:flex-row sm:items-center dark:border-green-900">
      <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
        <Radio className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">In progress with {s.customer.name}</p>
        <p className="text-sm text-muted">
          {M.label} · {minutes(sec)} · about {rupees(Math.round((s.ratePerMin * sec) / 60), { decimals: true })} so far
        </p>
        {s.maxMinutes ? <p className="text-xs text-muted">Ends automatically at {s.maxMinutes} min (plan limit per session)</p> : null}
      </div>
      <div className="flex gap-2">
        <ButtonLink href={`/session/${s.id}`} variant="outline" size="sm">
          Open session
        </ButtonLink>
        <Button variant="danger" size="sm" onClick={() => setConfirm(true)}>
          End session
        </Button>
      </div>

      <Modal open={confirm} onClose={() => !pending && setConfirm(false)} title="End this consultation?" description="The customer is charged per minute for the time so far and the amount goes to your earnings." size="sm">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirm(false)} disabled={pending}>
            Keep going
          </Button>
          <Button variant="danger" onClick={end} loading={pending}>
            End session
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
