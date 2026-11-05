import { AlertTriangle, CalendarClock, CreditCard, Info } from "lucide-react";
import { requireAstrologer } from "@/lib/auth/guard";
import { getSubscription, getUsage, listPlans, nextPeriodStart } from "@/lib/data/astro";
import { UsageMeters } from "@/components/UsageMeters";
import { formatDate, rupees } from "@/lib/format";
import { Badge, Card, CardHeader, EmptyState, InfoList, PageHeader } from "@/components/ui";
import { PlanCards } from "./PlanCards";

export const metadata = { title: "Subscription" };

const STATUS = {
  active: { label: "Active", tone: "success" },
  scheduled: { label: "Starts soon", tone: "info" },
  expired: { label: "Expired", tone: "danger" },
  none: { label: "No plan", tone: "neutral" },
  queued: { label: "Queued", tone: "info" },
};

export default async function SubscriptionPage() {
  const { id } = await requireAstrologer();
  const [sub, plans, usage, next] = await Promise.all([getSubscription(id), listPlans(), getUsage(id), nextPeriodStart(id)]);
  const st = STATUS[sub.status];

  return (
    <>
      <PageHeader title="Subscription" description="Your personal consultation plan. It doesn't change anything on your marketplace profile." />

      <Card className="mb-6">
        <CardHeader title="Current plan" action={<Badge tone={st.tone}>{st.label}</Badge>} />
        <div className="p-5">
          {sub.current ? (
            <InfoList
              items={[
                { label: "Plan", value: sub.current.planName },
                { label: "Days left", value: `${sub.daysLeft} day${sub.daysLeft === 1 ? "" : "s"}` },
                { label: "Started", value: formatDate(sub.current.startsAt) },
                { label: "Ends", value: formatDate(sub.current.endsAt) },
                sub.queued.length ? { label: "Paid until", value: `${formatDate(sub.paidUntil)} (${sub.totalDaysLeft} days in total)` } : null,
              ]}
            />
          ) : sub.status === "scheduled" ? (
            <p className="text-sm">
              Your paid period starts on <span className="font-medium">{formatDate(sub.queued[0].startsAt)}</span>.
            </p>
          ) : sub.status === "expired" ? (
            <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
              <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
              <p>
                <span className="font-semibold">Your subscription has expired. Please renew.</span> Your personal consultation service is offline and new bookings are paused. Your followers, history and earnings are kept, and your
                marketplace profile is not affected.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted">You don&apos;t have a plan yet. Choose one below to start your personal consultation page.</p>
          )}
        </div>
        {sub.current && (
          <div className="border-t border-line px-5 py-4">
            <p className="mb-3 text-sm font-medium">Sessions this period</p>
            <UsageMeters usage={usage} />
          </div>
        )}
        {sub.queued.length > 0 && (
          <div className="border-t border-line px-5 py-4">
            <p className="mb-2 text-sm font-medium">Prepaid periods</p>
            <ul className="space-y-2">
              {sub.queued.map((q) => (
                <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <CalendarClock className="size-4 text-accent" aria-hidden /> {q.planName}
                  </span>
                  <span className="text-muted">
                    Starts automatically on {formatDate(q.startsAt)} · ends {formatDate(q.endsAt)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold">{sub.status === "expired" ? "Renew your plan" : sub.status === "none" ? "Choose a plan" : "Buy the next period"}</h2>
      </div>
      <p className="mb-4 flex items-start gap-2 text-sm text-muted">
        <Info className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
        No automatic charges. Buy the next period early and it starts when the current one ends, so no paid days are lost. Every plan has a fixed number of chat, voice and video sessions per period; nothing is unlimited.
      </p>
      <PlanCards plans={plans} nextStart={next.startsAt} startsNow={next.startsNow} />

      <Card className="mt-6">
        <CardHeader title="Payment history" />
        {sub.purchases.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs text-muted">
                <tr className="border-b border-line">
                  <th className="px-5 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Reference</th>
                  <th className="px-3 py-2 font-medium">Plan</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  <th className="px-3 py-2 text-right font-medium">GST</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 font-medium">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sub.purchases.map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-2.5 whitespace-nowrap">{formatDate(p.paidAt)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{p.code}</td>
                    <td className="px-3 py-2.5">{p.planName}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{rupees(p.amount)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{rupees(p.gst)}</td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">{rupees(p.total)}</td>
                    <td className="px-3 py-2.5">
                      {p.status === "paid" ? <Badge tone="success">Paid</Badge> : <Badge tone="danger">Failed</Badge>}
                      {p.failureReason && <p className="mt-0.5 text-xs text-muted">{p.failureReason}</p>}
                    </td>
                    <td className="px-5 py-2.5 font-mono text-xs">{p.invoiceNo || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={CreditCard} title="No payments yet" />
        )}
      </Card>

      {sub.periods.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Subscription periods" description="Each paid purchase is one period. Periods never overlap." />
          <ul className="divide-y divide-line">
            {sub.periods.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <span className="font-medium">{p.planName}</span>
                <span className="text-muted">
                  {formatDate(p.startsAt)} – {formatDate(p.endsAt)}
                </span>
                <Badge tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
