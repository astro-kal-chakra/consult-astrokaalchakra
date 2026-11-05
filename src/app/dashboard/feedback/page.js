import { MessageSquareQuote, Star } from "lucide-react";
import { requireAstrologer } from "@/lib/auth/guard";
import { listFeedback } from "@/lib/data/astro";
import { formatDateTime } from "@/lib/format";
import { MODES } from "@/lib/modes";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { ReplyButton } from "./ReplyButton";

export const metadata = { title: "Feedback" };

function Stars({ value }) {
  return (
    <span className="inline-flex" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`size-4 ${n <= value ? "fill-brand-500 text-brand-500" : "text-line"}`} aria-hidden />
      ))}
    </span>
  );
}

export default async function FeedbackPage() {
  const { id } = await requireAstrologer();
  const fb = await listFeedback(id);
  const max = Math.max(1, ...fb.distribution.map((d) => d.count));

  return (
    <>
      <PageHeader title="Feedback" description="Feedback here is only from your personal consultations and is not shown on the marketplace." />

      <Card className="mb-6 grid gap-6 p-5 sm:grid-cols-[180px_1fr]">
        <div className="text-center sm:border-r sm:border-line sm:pr-6">
          <p className="text-4xl font-semibold tabular-nums">{fb.average ?? "-"}</p>
          {fb.average ? <Stars value={Math.round(fb.average)} /> : null}
          <p className="mt-1 text-sm text-muted">{fb.count ? `${fb.count} rating${fb.count === 1 ? "" : "s"}` : "No ratings yet"}</p>
        </div>
        <ul className="space-y-1.5">
          {fb.distribution.map((d) => (
            <li key={d.stars} className="flex items-center gap-3 text-sm">
              <span className="w-8 text-muted">{d.stars} ★</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
                <span className="block h-full rounded-full bg-brand-500" style={{ width: `${(d.count / max) * 100}%` }} />
              </span>
              <span className="w-6 text-right tabular-nums text-muted">{d.count}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        {fb.items.length ? (
          <ul className="divide-y divide-line">
            {fb.items.map((f) => (
              <li key={f.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{f.customer.name}</span>
                  {f.rating ? <Stars value={f.rating} /> : <Badge tone="warning">Missed session</Badge>}
                  <span className="text-xs text-muted">
                    {[f.sessionCode, MODES[f.mode]?.label, formatDateTime(f.createdAt)].filter(Boolean).join(" · ")}
                  </span>
                </div>
                {f.text && <p className="mt-1.5 text-sm">{f.text}</p>}
                {f.reply && (
                  <div className="mt-3 rounded-xl border-l-2 border-brand-400 bg-surface-muted px-3 py-2 text-sm">
                    <p className="text-xs font-medium text-accent">Your reply{f.reply.at ? ` · ${formatDateTime(f.reply.at)}` : ""}</p>
                    <p className="mt-0.5">{f.reply.text}</p>
                  </div>
                )}
                <div className="mt-2">
                  <ReplyButton item={f} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={MessageSquareQuote} title="No feedback yet" description="Customers can rate a session after it ends, or tell you about a missed one." />
        )}
      </Card>
    </>
  );
}
