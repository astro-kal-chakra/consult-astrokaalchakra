import Link from "next/link";
import { CalendarDays, Radio } from "lucide-react";
import { requireCustomer } from "@/lib/auth/guard";
import { listMyBookings, myLiveSessions } from "@/lib/data/customer-data";
import { formatDate, formatDateTime, formatRange, formatTime, minutes, rupees } from "@/lib/format";
import { MODES } from "@/lib/modes";
import { cn } from "@/lib/cn";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { BookingActions } from "./BookingActions";

export const metadata = { title: "My bookings" };
export const dynamic = "force-dynamic";

const STATUS = {
  upcoming: { label: "Upcoming", tone: "info" },
  completed: { label: "Completed", tone: "success" },
  missed: { label: "Missed", tone: "warning", note: "The astrologer didn't join within 2 minutes, so you weren't charged." },
  cancelled_by_customer: { label: "Cancelled by you", tone: "neutral", note: "Nothing was charged." },
  cancelled_by_astrologer: { label: "Cancelled by astrologer", tone: "danger", note: "Nothing was charged." },
  expired_not_attempted: { label: "Expired (not attempted)", tone: "neutral", note: "This session didn't take place, so you weren't charged." },
};

function BookingCard({ b }) {
  const M = MODES[b.mode];
  const st = STATUS[b.status] || { label: b.status, tone: "neutral" };
  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-accent">
        <M.icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/${b.astrologer.slug}`} className="font-medium hover:text-accent hover:underline">
            {b.astrologer.name}
          </Link>
          <Badge tone={st.tone}>{st.label}</Badge>
        </div>
        <p className="mt-0.5 text-sm text-muted">
          <Link href={`/my/bookings/${b.id}`} className="font-mono text-xs text-accent hover:underline">
            {b.code}
          </Link>{" "}
          · {M.label} · {b.durationMinutes} min · {rupees(b.ratePerMin)}/min
        </p>
        {b.concern && <p className="mt-1 text-sm">&ldquo;{b.concern}&rdquo;</p>}
        {b.status === "completed" && (
          <p className="mt-1 text-sm">
            Charged <span className="font-semibold">{rupees(b.amountCharged, { decimals: true })}</span>
            {b.session?.durationSec ? ` for ${minutes(b.session.durationSec)}` : ""} from your wallet
          </p>
        )}
        {(st.note || b.note) && <p className="mt-1 text-xs text-muted">{b.note || st.note}</p>}
        {b.status === "cancelled_by_astrologer" && b.cancelReason && <p className="mt-0.5 text-xs text-muted">Reason: {b.cancelReason}</p>}
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:items-end">
        <div className="sm:text-right">
          <p className="text-sm font-semibold">{formatRange(b.scheduledAt, b.durationMinutes)}</p>
          <p className="text-xs text-muted">{formatDate(b.scheduledAt)}</p>
          {b.status === "upcoming" && <p className="mt-0.5 text-xs text-muted">Est. {rupees(b.ratePerMin * b.durationMinutes)} · charged per minute</p>}
        </div>
        <BookingActions booking={b} />
        <Link href={`/my/bookings/${b.id}`} className="text-xs font-medium text-accent hover:underline">
          View status &amp; details →
        </Link>
      </div>
    </li>
  );
}

export default async function MyBookingsPage({ searchParams }) {
  const { id } = await requireCustomer("/my/bookings");
  const sp = await searchParams;
  const tab = sp?.tab === "past" ? "past" : "upcoming";
  const [{ upcoming, past }, live] = await Promise.all([listMyBookings(id), myLiveSessions(id)]);
  const list = tab === "past" ? past : upcoming;

  return (
    <>
      <PageHeader title="My bookings" description="Your personal consultations. Nothing is charged at booking. You pay per minute only during the session." />

      {live.map((s) => (
        <Link
          key={s.id}
          href={`/session/${s.id}`}
          className="mb-4 flex items-center gap-3 rounded-2xl border border-brand-300 bg-brand-50 px-4 py-3 text-sm hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-950/40 dark:hover:bg-brand-950/60"
        >
          <Radio className="size-5 shrink-0 text-brand-600" aria-hidden />
          <span className="flex-1">
            {s.status === "waiting" ? (
              <>
                Waiting for <span className="font-semibold">{s.astrologer}</span> to accept your {MODES[s.mode].label.toLowerCase()} request
              </>
            ) : (
              <>
                Your {MODES[s.mode].label.toLowerCase()} with <span className="font-semibold">{s.astrologer}</span> is in progress
              </>
            )}
          </span>
          <span className="font-semibold text-accent">{s.status === "waiting" ? "Open" : "Join"}</span>
        </Link>
      ))}

      <Card>
        <div className="flex gap-1 border-b border-line px-3 pt-2" role="tablist">
          {[
            ["upcoming", `Upcoming (${upcoming.length})`],
            ["past", `Past (${past.length})`],
          ].map(([key, label]) => (
            <Link
              key={key}
              href={key === "upcoming" ? "/my/bookings" : "/my/bookings?tab=past"}
              role="tab"
              aria-selected={tab === key}
              className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium", tab === key ? "border-brand-600 text-accent" : "border-transparent text-muted hover:text-fg")}
            >
              {label}
            </Link>
          ))}
        </div>
        {list.length ? (
          <ul className="divide-y divide-line">
            {list.map((b) => (
              <BookingCard key={b.id} b={b} />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title={tab === "past" ? "No past bookings" : "No upcoming bookings"}
            description="Find your astrologer's personal page link on their Astro Kaal Chakra profile."
          />
        )}
      </Card>
      <p className="mt-3 text-xs text-muted">Reminders are sent 24 h, 1 h and 10 min before each session. You can cancel up to 1 hour before. {upcoming[0] ? `Next: ${formatDateTime(upcoming[0].scheduledAt)}.` : ""}</p>
    </>
  );
}
