import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Circle, Clock3, X } from "lucide-react";
import { requireCustomer } from "@/lib/auth/guard";
import { getMyBooking } from "@/lib/data/customer-data";
import { SaasError } from "@/lib/data/saas";
import { formatDate, formatDateTime, formatRange, formatTime, minutes, rupees } from "@/lib/format";
import { MODES } from "@/lib/modes";
import { cn } from "@/lib/cn";
import { Badge, Card, CardHeader, InfoList } from "@/components/ui";
import { BookingActions } from "../BookingActions";

export const metadata = { title: "Booking details" };
export const dynamic = "force-dynamic";

const STATUS = {
  upcoming: { label: "Upcoming", tone: "info" },
  completed: { label: "Completed", tone: "success" },
  missed: { label: "Missed (not charged)", tone: "warning" },
  cancelled_by_customer: { label: "Cancelled by you", tone: "neutral" },
  cancelled_by_astrologer: { label: "Cancelled by astrologer", tone: "danger" },
  expired_not_attempted: { label: "Expired (not attempted)", tone: "neutral" },
};
const PRESENCE = { online: "Online now", busy: "Busy", offline: "Offline" };

function StepIcon({ state }) {
  const base = "flex size-7 shrink-0 items-center justify-center rounded-full";
  if (state === "done") return <span className={cn(base, "bg-green-600 text-white")}><Check className="size-4" aria-hidden /></span>;
  if (state === "failed") return <span className={cn(base, "bg-surface-muted text-muted")}><X className="size-4" aria-hidden /></span>;
  if (state === "current") return <span className={cn(base, "bg-brand-600 text-white")}><Clock3 className="size-4" aria-hidden /></span>;
  return <span className={cn(base, "border-2 border-line text-muted")}><Circle className="size-2" aria-hidden /></span>;
}

/** One booking: its status timeline, what it costs, the astrologer, and the next step. */
export default async function BookingDetailPage({ params }) {
  const { id } = await params;
  const { id: cid } = await requireCustomer(`/my/bookings/${id}`);
  let b;
  try {
    b = await getMyBooking(cid, id);
  } catch (e) {
    if (e instanceof SaasError && ["NOT_FOUND", "VALIDATION_ERROR"].includes(e.code)) notFound();
    throw e;
  }
  const M = MODES[b.mode];
  const st = STATUS[b.status] || { label: b.status, tone: "neutral" };
  const a = b.astrologerInfo;

  return (
    <div className="mx-auto max-w-5xl 2xl:max-w-6xl">
      <Link href="/my/bookings" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> My bookings
      </Link>
      <div className="mt-3 mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl sm:text-3xl">
          {M.label} with {b.astrologer.name}
        </h1>
        <Badge tone={st.tone}>{st.label}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Status" />
            <ol className="space-y-4 p-5">
              {b.steps.map((s) => (
                <li key={s.key} className="flex gap-3">
                  <StepIcon state={s.state} />
                  <div className="min-w-0">
                    <p className={cn("text-sm font-medium", s.state === "pending" && "text-muted")}>{s.label}</p>
                    {s.at && <p className="text-xs text-muted">{formatDateTime(s.at)}</p>}
                    {s.text && <p className="mt-0.5 text-sm text-muted">{s.text}</p>}
                  </div>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-4">
              <BookingActions booking={b} />
              {b.canJoin && <span className="text-sm text-muted">The astrologer is waiting in the session.</span>}
            </div>
          </Card>

          <Card>
            <CardHeader title="Booking" />
            <div className="p-5">
              <InfoList
                items={[
                  { label: "Booking code", value: b.code },
                  { label: "Type", value: M.label },
                  { label: "Date", value: formatDate(b.scheduledAt) },
                  { label: "Time (IST)", value: `${formatRange(b.scheduledAt, b.durationMinutes)} · ${b.durationMinutes} min` },
                  { label: "Rate", value: `${rupees(b.ratePerMin)}/min` },
                  b.status === "completed"
                    ? { label: "Charged", value: `${rupees(b.amountCharged, { decimals: true })}${b.session?.durationSec ? ` for ${minutes(b.session.durationSec)}` : ""}` }
                    : { label: "Estimated cost", value: `${rupees(b.ratePerMin * b.durationMinutes)} (charged per minute, only if it happens)` },
                  { label: "Your question", value: b.concern },
                  b.cancelReason ? { label: "Cancel reason", value: b.cancelReason } : null,
                ]}
              />
              {b.status === "upcoming" && (
                <p className="mt-4 rounded-xl bg-surface-muted p-3 text-xs text-muted">
                  {b.canCancel ? "You can cancel until 1 hour before the start time." : "Less than 1 hour to go, so this booking can no longer be cancelled."} Keep enough balance in your wallet for the session.
                </p>
              )}
            </div>
          </Card>
        </div>

        {a && (
          <Card className="h-fit">
            <CardHeader title="Astrologer" />
            <div className="space-y-3 p-5">
              <div>
                <Link href={`/${a.slug}`} className="font-semibold hover:text-accent hover:underline">
                  {a.name}
                </Link>
                <p className="text-sm text-muted">{a.headline}</p>
                <p className="mt-1 text-xs text-muted">{PRESENCE[a.presence] || "Offline"}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {a.expertise.slice(0, 4).map((e) => (
                  <Badge key={e}>{e}</Badge>
                ))}
              </div>
              <p className="text-xs text-muted">Speaks {a.languages.join(", ")}</p>
              <Link href={`/${a.slug}`} className="block rounded-xl border border-line px-3 py-2 text-center text-sm font-medium hover:border-brand-400">
                View profile &amp; book again
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
