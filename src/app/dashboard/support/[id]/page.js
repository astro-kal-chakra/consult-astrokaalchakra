import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAstrologer } from "@/lib/auth/guard";
import { SaasError } from "@/lib/data/saas";
import { getMyTicket, getSupportMeta } from "@/lib/data/astro";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Badge, Card } from "@/components/ui";
import { TICKET_STATUS } from "../status";
import { TicketReply } from "./TicketReply";

export const metadata = { title: "Support ticket" };

export default async function TicketPage({ params }) {
  const { id } = await requireAstrologer();
  const { id: ticketId } = await params;
  let t;
  try {
    t = await getMyTicket(id, ticketId);
  } catch (e) {
    if (e instanceof SaasError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const st = TICKET_STATUS[t.status] || TICKET_STATUS.open;
  const { limits } = await getSupportMeta();

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/dashboard/support" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Help & support
      </Link>
      <div className="mt-3 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl">{t.subject}</h1>
          <Badge tone={st.tone}>{st.label}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">
          <span className="font-mono">{t.code}</span> · {t.categoryLabel} · opened {formatDateTime(t.createdAt)}
        </p>
      </div>

      <Card className="p-5">
        <ol className="space-y-4">
          {t.messages.map((m) => {
            const mine = m.from === "astrologer";
            return (
              <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-sm", mine ? "rounded-br-md bg-brand-50 dark:bg-brand-900/40" : "rounded-bl-md bg-surface-muted")}>
                  <p className="mb-1 text-xs font-medium text-muted">
                    {mine ? "You" : "Astro Kaal Chakra support"} · {formatDateTime(m.at)}
                  </p>
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      <TicketReply ticketId={t.id} status={t.status} canReply={t.canReopen} max={limits.message[1]} />
    </div>
  );
}
