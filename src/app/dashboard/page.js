import Link from "next/link";
import { CalendarDays, Clock3, IndianRupee, MessageCircle, Phone, Star, Users, Video, Wallet } from "lucide-react";
import { requireAstrologer } from "@/lib/auth/guard";
import { getEligibility, getOverview } from "@/lib/data/astro";
import { UsageMeters } from "@/components/UsageMeters";
import { formatDate, formatDateTime, formatRange, formatTime, minutes, rupees, timeAgo } from "@/lib/format";
import { Badge, ButtonLink, Card, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui";

export const metadata = { title: "Overview" };

const MODE = { chat: { label: "Chat", icon: MessageCircle }, audio: { label: "Voice call", icon: Phone }, video: { label: "Video call", icon: Video } };

export default async function OverviewPage() {
  const { id } = await requireAstrologer();
  const [o, el] = await Promise.all([getOverview(id), getEligibility(id)]);
  const s = o.stats;

  return (
    <>
      <PageHeader title="Overview" description="Your personal consultation business at a glance. Marketplace numbers are not included here." />

      {/* Activation checklist (all must be true for the personal page to be live) */}
      {!el.canConsult && (
        <Card className="mb-6 p-5">
          <h2 className="font-semibold">Go-live checklist</h2>
          <p className="mt-0.5 text-sm text-muted">Your personal page goes live when every step is done.</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {el.checks.map((c) => (
              <li key={c.key} className="flex items-center gap-2 text-sm">
                <span className={c.ok ? "flex size-5 items-center justify-center rounded-full bg-green-600 text-white" : "flex size-5 items-center justify-center rounded-full border-2 border-line"}>{c.ok ? "✓" : ""}</span>
                <span className={c.ok ? "" : "text-muted"}>{c.label}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={CalendarDays} label="Upcoming bookings" value={s.upcomingBookings} />
        <StatCard icon={Clock3} label="Sessions this month" value={s.monthSessions} sub={`${s.monthMinutes} minutes`} />
        <StatCard icon={IndianRupee} label="Earned this month" value={rupees(s.monthEarnings)} sub="No platform commission" />
        <StatCard icon={Wallet} label="Available to withdraw" value={rupees(s.balance)} />
        <StatCard icon={Users} label="Personal followers" value={s.followers} />
        <StatCard icon={Star} label="Rating" value={s.rating ?? "-"} sub={s.ratingCount ? `${s.ratingCount} reviews` : "No reviews yet"} />
      </div>

      {el.usage.period && (
        <Card className="mt-6">
          <CardHeader title={`Plan usage · ${el.usage.period.planName}`} action={<Link href="/dashboard/subscription" className="text-sm text-accent hover:underline">Plans</Link>} />
          <div className="p-5">
            <UsageMeters usage={el.usage} compact />
          </div>
        </Card>
      )}

      {o.waiting.length > 0 && (
        <Card className="mt-6 border-brand-300 bg-brand-50/60 p-5 dark:border-brand-800 dark:bg-brand-950/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{o.waiting.length} customer waiting for a talk-now consultation</p>
              <p className="text-sm text-muted">Accept within 2 minutes or the request expires (nothing is charged).</p>
            </div>
            <ButtonLink href="/dashboard/consultations">Open consultations</ButtonLink>
          </div>
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Next bookings" action={<Link href="/dashboard/bookings" className="text-sm text-accent hover:underline">All bookings</Link>} />
          {o.nextBookings.length ? (
            <ul className="divide-y divide-line">
              {o.nextBookings.map((b) => {
                const M = MODE[b.mode];
                return (
                  <li key={b.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-accent">
                      <M.icon className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{b.customer.name}</p>
                      <p className="text-xs text-muted">
                        {M.label} · {b.durationMinutes} min · {rupees(b.ratePerMin)}/min
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="font-medium">{formatRange(b.scheduledAt, b.durationMinutes)}</p>
                      <p className="text-muted">{formatDate(b.scheduledAt)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={CalendarDays} title="No upcoming bookings" description="New bookings from your personal page show up here." />
          )}
        </Card>

        <Card>
          <CardHeader title="Recent consultations" action={<Link href="/dashboard/consultations" className="text-sm text-accent hover:underline">History</Link>} />
          {o.recentSessions.length ? (
            <ul className="divide-y divide-line">
              {o.recentSessions.map((x) => (
                <li key={x.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{x.customer.name}</p>
                    <p className="text-xs text-muted">
                      {MODE[x.mode].label} · {minutes(x.durationSec)} · {x.type === "talk_now" ? "Talk now" : "Scheduled"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">{rupees(x.amount)}</p>
                    <p className="text-xs text-muted">{timeAgo(x.endedAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={MessageCircle} title="No consultations yet" />
          )}
        </Card>
      </div>

      {o.recentFeedback.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Latest feedback" action={<Link href="/dashboard/feedback" className="text-sm text-accent hover:underline">All feedback</Link>} />
          <ul className="divide-y divide-line">
            {o.recentFeedback.map((f) => (
              <li key={f.id} className="px-5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{f.customer.name}</span>
                  {f.rating ? <Badge tone="brand">★ {f.rating}</Badge> : <Badge tone="warning">Missed session</Badge>}
                  <span className="text-xs text-muted">{formatDateTime(f.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm text-muted">{f.text}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
