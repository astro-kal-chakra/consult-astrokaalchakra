import Link from "next/link";
import { BellRing, CalendarDays } from "lucide-react";
import { requireAstrologer } from "@/lib/auth/guard";
import { listBookings } from "@/lib/data/astro";
import { formatDate, formatDateTime, formatRange, formatTime, rupees } from "@/lib/format";
import { MODES } from "@/lib/modes";
import { cn } from "@/lib/cn";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { CancelBooking } from "./CancelBooking";
import { StartBooking } from "./StartBooking";

export const metadata = { title: "Bookings" };

const STATUS = {
  upcoming: { label: "Upcoming", tone: "brand" },
  in_progress: { label: "In progress", tone: "success" },
  completed: { label: "Completed", tone: "success" },
  missed: { label: "Missed", tone: "danger" },
  cancelled_by_customer: { label: "Cancelled by customer", tone: "neutral" },
  cancelled_by_astrologer: { label: "Cancelled by you", tone: "neutral" },
  expired_not_attempted: { label: "Expired (not attempted)", tone: "warning" },
};

function statusNote(b) {
  switch (b.status) {
    case "completed":
      return `Charged ${rupees(b.amountCharged, { decimals: true })}`;
    case "missed":
      return "Astrologer didn't join in 2 min, not charged";
    case "cancelled_by_customer":
      return `Cancelled ${b.cancelledAt ? formatDateTime(b.cancelledAt) : ""}, not charged`;
    case "cancelled_by_astrologer":
      return `${b.cancelReason ? `Reason: ${b.cancelReason}` : "No reason given"}, not charged`;
    case "expired_not_attempted":
      return `${b.note || "Session did not take place"}, not charged`;
    default:
      return null;
  }
}

function BookingRow({ b }) {
  const M = MODES[b.mode];
  const st = STATUS[b.status] || { label: b.status, tone: "neutral" };
  const note = statusNote(b);
  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-accent">
        <M.icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{b.customer.name}</p>
          <span className="text-xs text-muted">{b.customer.city}</span>
          <Badge tone={st.tone}>{st.label}</Badge>
        </div>
        <p className="mt-0.5 text-sm text-muted">
          <span className="font-mono text-xs">{b.code}</span> · {M.label} · {b.durationMinutes} min · {rupees(b.ratePerMin)}/min
        </p>
        {b.concern && <p className="mt-1 text-sm">&ldquo;{b.concern}&rdquo;</p>}
        {note && <p className="mt-1 text-xs text-muted">{note}</p>}
      </div>
      <div className="flex shrink-0 flex-row items-center justify-between gap-3 sm:flex-col sm:items-end">
        <div className="sm:text-right">
          <p className="text-sm font-semibold">{formatRange(b.scheduledAt, b.durationMinutes)}</p>
          <p className="text-xs text-muted">{formatDate(b.scheduledAt)}</p>
          {b.status === "upcoming" && <p className="mt-0.5 text-xs text-muted">Est. {rupees(b.ratePerMin * b.durationMinutes)}</p>}
        </div>
        {b.status === "in_progress" && (
          <Link href="/dashboard/consultations" className="text-sm font-medium text-accent hover:underline">
            Open in consultations
          </Link>
        )}
        {b.status === "upcoming" && (
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <StartBooking booking={b} />
            <CancelBooking booking={b} />
          </div>
        )}
      </div>
    </li>
  );
}

export default async function BookingsPage({ searchParams }) {
  const { id } = await requireAstrologer();
  const sp = await searchParams;
  const tab = sp?.tab === "past" ? "past" : "upcoming";
  const data = await listBookings(id);
  const rows = tab === "past" ? data.past : data.upcoming;
  const tabs = [
    { key: "upcoming", label: "Upcoming", count: data.counts.upcoming },
    { key: "past", label: "Past", count: data.counts.past },
  ];

  return (
    <>
      <PageHeader title="Bookings" description="Scheduled personal consultations. These are separate from your marketplace bookings." />

      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-line bg-surface-muted px-4 py-3 text-sm">
        <BellRing className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
        <p className="text-muted">
          Nothing is charged at booking. The customer pays per minute from their wallet during the session. Reminders go to you and the customer 24 h, 1 h and 10 min before. You or the customer can cancel up to 1 hour before.
        </p>
      </div>

      <Card>
        <div className="flex gap-1 border-b border-line px-3 pt-2" role="tablist">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={`/dashboard/bookings${t.key === "past" ? "?tab=past" : ""}`}
              role="tab"
              aria-selected={tab === t.key}
              className={cn("-mb-px border-b-2 px-3 py-2.5 text-sm font-medium", tab === t.key ? "border-brand-600 text-accent" : "border-transparent text-muted hover:text-fg")}
            >
              {t.label} <span className="ml-1 rounded-full bg-surface-muted px-1.5 text-xs">{t.count}</span>
            </Link>
          ))}
        </div>
        {rows.length ? (
          <ul className="divide-y divide-line">
            {rows.map((b) => (
              <BookingRow key={b.id} b={b} />
            ))}
          </ul>
        ) : (
          <EmptyState icon={CalendarDays} title={tab === "past" ? "No past bookings" : "No upcoming bookings"} description="Customers book from your personal page during your available hours." />
        )}
      </Card>
    </>
  );
}
