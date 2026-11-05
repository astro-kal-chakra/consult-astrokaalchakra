import { History, Inbox, PowerOff } from "lucide-react";
import { requireAstrologer } from "@/lib/auth/guard";
import { getEligibility, listSessions } from "@/lib/data/astro";
import { formatDateTime, minutes, rupees } from "@/lib/format";
import { MODES } from "@/lib/modes";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { ActiveCard, WaitingCard } from "./LiveCards";
import { AutoRefresh } from "./AutoRefresh";

export const metadata = { title: "Consultations" };

const STATUS = {
  completed: { label: "Completed", tone: "success" },
  missed: { label: "Missed", tone: "danger" },
  declined: { label: "Declined", tone: "neutral" },
  cancelled_by_customer: { label: "Cancelled by customer", tone: "neutral" },
};

export default async function ConsultationsPage() {
  const { id } = await requireAstrologer();
  const [{ canConsult, usage }, { waiting, active, history: past }] = await Promise.all([getEligibility(id), listSessions(id)]);
  // eslint-disable-next-line react-hooks/purity -- server render time, used to anchor the client countdowns
  const serverNow = Date.now();

  return (
    <>
      <AutoRefresh ms={8000} />
      <PageHeader title="Consultations" description="Talk-now requests, sessions in progress and your personal consultation history." />

      {!canConsult && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          <PowerOff className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>Your personal service is offline, so customers can&apos;t request consultations right now. Complete the go-live checklist on the Overview page.</p>
        </div>
      )}

      {active.length > 0 && (
        <section className="mb-6 space-y-3" aria-label="In progress">
          {active.map((s) => (
            <ActiveCard key={s.id} s={s} serverNow={serverNow} />
          ))}
        </section>
      )}

      <section className="mb-6" aria-label="Waiting now">
        <h2 className="mb-3 font-semibold">Waiting now</h2>
        {waiting.length ? (
          <div className="space-y-3">
            {waiting.map((s) => (
              <WaitingCard key={s.id} s={s} canConsult={canConsult} limitReached={Boolean(usage?.modes?.[s.mode]?.full)} serverNow={serverNow} />
            ))}
            <p className="text-xs text-muted">Accept within 2 minutes or the request expires. Nothing is charged for expired or declined requests.</p>
          </div>
        ) : (
          <Card>
            <EmptyState icon={Inbox} title="No one is waiting" description="Talk-now requests from your personal page appear here while you are online." />
          </Card>
        )}
      </section>

      <Card>
        <CardHeader title="History" description="Charged per minute from the customer's wallet during the session." />
        {past.length ? (
          <>
            <table className="hidden w-full text-sm md:table">
              <thead className="text-left text-xs text-muted">
                <tr className="border-b border-line">
                  <th className="px-5 py-2.5 font-medium">Session</th>
                  <th className="px-3 py-2.5 font-medium">Customer</th>
                  <th className="px-3 py-2.5 font-medium">Type</th>
                  <th className="px-3 py-2.5 font-medium">Started</th>
                  <th className="px-3 py-2.5 font-medium">Duration</th>
                  <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-5 py-2.5 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {past.map((s) => {
                  const st = STATUS[s.status] || { label: s.status, tone: "neutral" };
                  return (
                    <tr key={s.id}>
                      <td className="px-5 py-3 font-mono text-xs">{s.code}</td>
                      <td className="px-3 py-3">{s.customer.name}</td>
                      <td className="px-3 py-3 text-muted">
                        {s.type === "talk_now" ? "Talk now" : "Scheduled"} · {MODES[s.mode].label}
                      </td>
                      <td className="px-3 py-3 text-muted">{s.startedAt ? formatDateTime(s.startedAt) : "-"}</td>
                      <td className="px-3 py-3 tabular-nums">{s.durationSec ? minutes(s.durationSec) : "-"}</td>
                      <td className="px-3 py-3 text-right font-medium tabular-nums">{rupees(s.amount, { decimals: true })}</td>
                      <td className="px-5 py-3 text-right">
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <ul className="divide-y divide-line md:hidden">
              {past.map((s) => {
                const st = STATUS[s.status] || { label: s.status, tone: "neutral" };
                return (
                  <li key={s.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{s.customer.name}</p>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {s.code} · {s.type === "talk_now" ? "Talk now" : "Scheduled"} · {MODES[s.mode].label}
                    </p>
                    <p className="mt-1 flex justify-between text-sm">
                      <span className="text-muted">{s.startedAt ? formatDateTime(s.startedAt) : "Did not start"}{s.durationSec ? ` · ${minutes(s.durationSec)}` : ""}</span>
                      <span className="font-medium tabular-nums">{rupees(s.amount, { decimals: true })}</span>
                    </p>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <EmptyState icon={History} title="No consultations yet" />
        )}
      </Card>
    </>
  );
}
