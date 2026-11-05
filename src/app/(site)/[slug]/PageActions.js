"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Heart, Zap } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatRange, formatTime, rupees } from "@/lib/format";
import { MODES } from "@/lib/modes";
import { Button, Textarea } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { bookAction, followAction, talkNowAction } from "./actions";

/** Handles the "not signed in" answer from every action: go to login and come back here. */
function useGuarded(slug) {
  const router = useRouter();
  const toast = useToast();
  return (r, onOk) => {
    if (r.ok) return onOk(r.data);
    if (r.error.code === "LOGIN")
      return router.push(
        `/login?as=customer&next=${encodeURIComponent(`/${slug}`)}`,
      );
    toast(r.error.message, { type: "error" });
    if (r.error.code === "LOW_BALANCE")
      toast(
        "Recharge your wallet in the Astro Kaal Chakra app or website. It's the same wallet.",
        { type: "error" },
      );
  };
}

export function FollowButton({
  slug,
  following: initial,
  followers: initialCount,
}) {
  const [state, setState] = useState({
    following: initial,
    followers: initialCount,
  });
  const [pending, start] = useTransition();
  const handle = useGuarded(slug);
  return (
    <div className="flex items-center gap-3">
      <Button
        variant={state.following ? "outline" : "primary"}
        loading={pending}
        aria-pressed={state.following}
        onClick={() =>
          start(async () =>
            handle(await followAction(slug), (d) => setState(d)),
          )
        }
      >
        {!pending && (
          <Heart
            className={cn(state.following && "fill-current text-red-500")}
            aria-hidden
          />
        )}
        {state.following ? "Following" : "Follow"}
      </Button>
      <span className="text-sm text-muted">
        {state.followers} follower{state.followers === 1 ? "" : "s"}
      </span>
    </div>
  );
}

/** Per-type price rows with "Talk now" (when the astrologer is online and accepts instant consultations). */
export function ConsultOptions({ slug, services, talkNow, maxSessionMinutes }) {
  const router = useRouter();
  const handle = useGuarded(slug);
  const [busy, setBusy] = useState(null);
  const [, start] = useTransition();
  const talk = (mode) =>
    start(async () => {
      setBusy(mode);
      const r = await talkNowAction(slug, mode);
      setBusy(null);
      handle(r, (d) => router.push(`/session/${d.id}`));
    });
  return (
    <div className="space-y-3">
      {Object.entries(MODES).map(([m, M]) => {
        const s = services[m];
        if (!s?.enabled) return null;
        return (
          <div
            key={m}
            className="flex items-center gap-3 rounded-xl border border-line p-3"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
              <M.icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{M.label}</p>
              <p className="text-sm text-muted">
                {s.available
                  ? `${rupees(s.price)}/min`
                  : "Not available right now"}
              </p>
            </div>
            {talkNow && s.available && (
              <Button
                size="sm"
                onClick={() => talk(m)}
                loading={busy === m}
                disabled={Boolean(busy)}
              >
                {busy !== m && <Zap aria-hidden />} Talk now
              </Button>
            )}
          </div>
        );
      })}
      <p className="text-xs text-muted">
        Charged per minute from your Astro Kaal Chakra wallet during the
        session. Nothing is charged if it doesn&apos;t happen. Sessions last up
        to {maxSessionMinutes} min.
      </p>
    </div>
  );
}

const dayLabel = (date) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
};

const durationLabel = (n) => (n === 60 ? "1 hour" : `${n} min`);

/** Pick type → length → day → time → optional question → book. Nothing is charged at booking. */
export function BookingPanel({ slug, services, durations, slotsByDuration }) {
  const router = useRouter();
  const toast = useToast();
  const handle = useGuarded(slug);
  const modes = Object.keys(MODES).filter(
    (m) => services[m]?.enabled && services[m]?.available,
  );
  const [mode, setMode] = useState(modes[0] || null);
  const [length, setLength] = useState(
    durations.includes(30) ? 30 : durations[durations.length - 1] || null,
  );
  const days = slotsByDuration[length] || [];
  const [dayPick, setDay] = useState(null);
  // The chosen day may have no times for a new length: fall back to the first day that has some
  const day = days.some((d) => d.date === dayPick)
    ? dayPick
    : days[0]?.date || null;
  const [time, setTime] = useState(null);
  const [concern, setConcern] = useState("");
  const [pending, start] = useTransition();

  if (!modes.length || !durations.length)
    return (
      <p className="text-sm text-muted">
        Booking isn&apos;t available right now. Please check again later.
      </p>
    );

  const slots = days.find((d) => d.date === day)?.slots || [];
  const chooseLength = (n) => {
    setLength(n);
    setTime(null);
  };
  const rate = services[mode]?.price || 0;

  const book = () =>
    start(async () => {
      const r = await bookAction(slug, {
        mode,
        startsAt: time,
        minutes: length,
        concern,
      });
      handle(r, () => {
        toast("Booked! You'll get reminders before the session.");
        router.push("/my/bookings");
      });
      // Someone else took this time a moment ago: clear it and reload the times
      if (!r.ok && r.error?.code === "SLOT_TAKEN") {
        setTime(null);
        router.refresh();
      }
    });

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-medium">Consultation type</p>
        <div
          className="flex flex-wrap gap-2"
          role="radiogroup"
          aria-label="Consultation type"
        >
          {modes.map((m) => {
            const M = MODES[m];
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm",
                  mode === m
                    ? "border-brand-500 bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                    : "border-line hover:border-brand-300",
                )}
              >
                <M.icon className="size-4" aria-hidden /> {M.label} ·{" "}
                {rupees(services[m].price)}/min
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Session length</p>
        <div
          className="flex flex-wrap gap-2"
          role="radiogroup"
          aria-label="Session length"
        >
          {durations.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={length === n}
              onClick={() => chooseLength(n)}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm",
                length === n
                  ? "border-brand-500 bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                  : "border-line hover:border-brand-300",
              )}
            >
              {durationLabel(n)}
              {rate > 0 && (
                <span className="block text-[11px] text-muted">
                  ≈ {rupees(rate * n)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {!days.length ? (
        <p className="rounded-xl bg-surface-muted p-4 text-sm text-muted">
          No available times for a {durationLabel(length)} session in the next
          few days. Try a shorter length or check again later.
        </p>
      ) : (
        <>
          <div>
            <p className="mb-2 text-sm font-medium">Date</p>
            <div
              className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
              role="radiogroup"
              aria-label="Date"
            >
              {days.map((d) => (
                <button
                  key={d.date}
                  type="button"
                  role="radio"
                  aria-checked={day === d.date}
                  onClick={() => {
                    setDay(d.date);
                    setTime(null);
                  }}
                  className={cn(
                    "shrink-0 rounded-xl border px-3 py-2 text-sm whitespace-nowrap",
                    day === d.date
                      ? "border-brand-500 bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                      : "border-line hover:border-brand-300",
                  )}
                >
                  {dayLabel(d.date)}
                  <span className="block text-[11px] text-muted">
                    {d.available ? `${d.available} available` : "Fully booked"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Time (IST)</p>
            <div
              className="grid grid-cols-2 gap-2 sm:grid-cols-3"
              role="radiogroup"
              aria-label="Time"
            >
              {slots.map((s) => (
                <button
                  key={s.at}
                  type="button"
                  role="radio"
                  aria-checked={time === s.at}
                  aria-disabled={s.booked || undefined}
                  disabled={s.booked}
                  title={s.booked ? "Already booked" : undefined}
                  onClick={() => setTime(s.at)}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-xs tabular-nums sm:text-sm",
                    s.booked
                      ? "cursor-not-allowed border-dashed border-line bg-surface-muted text-muted line-through decoration-muted/60"
                      : time === s.at
                        ? "border-brand-500 bg-brand-600 font-medium text-white"
                        : "border-line hover:border-brand-300",
                  )}
                >
                  {formatRange(s.at, length)}
                  {s.booked && (
                    <span className="block text-[10px] font-medium no-underline">
                      Already booked
                    </span>
                  )}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">
              Greyed-out times are already booked by someone else. Each session keeps a 10-minute gap before and after it.
            </p>
          </div>
        </>
      )}

      <div>
        <label htmlFor="concern" className="mb-2 block text-sm font-medium">
          Your question{" "}
          <span className="font-normal text-muted">(optional)</span>
        </label>
        <Textarea
          id="concern"
          value={concern}
          onChange={(e) => setConcern(e.target.value)}
          maxLength={300}
          placeholder="e.g. When will my career change?"
        />
        <p className="mt-1 text-right text-xs text-muted">
          {concern.length}/300
        </p>
      </div>

      {time && (
        <dl className="space-y-1.5 rounded-xl bg-surface-muted p-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Session</dt>
            <dd>
              {MODES[mode].label} · {dayLabel(day)}, {formatRange(time, length)} ·{" "}
              {durationLabel(length)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Rate</dt>
            <dd>{rupees(rate)}/min</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-1.5 font-semibold">
            <dt>Estimated total</dt>
            <dd>{rupees(rate * length)}</dd>
          </div>
          <p className="pt-1 text-xs text-muted">
            Nothing is charged now. You pay per minute from your wallet only
            during the session.
          </p>
        </dl>
      )}

      <Button
        size="lg"
        className="w-full"
        disabled={!time}
        loading={pending}
        onClick={book}
      >
        {!pending && <CalendarCheck aria-hidden />}{" "}
        {time ? "Book this time" : "Choose a time"}
      </Button>
      <p className="text-center text-xs text-muted">
        You can cancel up to 1 hour before. Reminders 24 h, 1 h and 10 min
        before.
      </p>
    </div>
  );
}
