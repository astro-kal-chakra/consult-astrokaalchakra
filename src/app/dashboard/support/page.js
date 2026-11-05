import Link from "next/link";
import { ChevronRight, LifeBuoy } from "lucide-react";
import { requireAstrologer } from "@/lib/auth/guard";
import { getSupportMeta, listMyTickets } from "@/lib/data/astro";
import { formatDateTime } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { NewTicket } from "./NewTicket";
import { TICKET_STATUS } from "./status";

export const metadata = { title: "Help & support" };

export default async function SupportPage() {
  const { id } = await requireAstrologer();
  const [items, meta] = await Promise.all([listMyTickets(id), getSupportMeta()]);

  return (
    <>
      <PageHeader
        title="Help & support"
        description="Questions or problems with your personal consultation service. Our team replies here."
        action={<NewTicket categories={meta.categories} limits={meta.limits} />}
      />

      <Card>
        {items.length ? (
          <ul className="divide-y divide-line">
            {items.map((t) => {
              const st = TICKET_STATUS[t.status] || TICKET_STATUS.open;
              return (
                <li key={t.id}>
                  <Link href={`/dashboard/support/${t.id}`} className="flex items-center gap-3 px-5 py-4 hover:bg-surface-muted">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{t.subject}</p>
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </div>
                      {t.lastMessage && (
                        <p className="mt-0.5 truncate text-sm text-muted">
                          {t.lastMessage.from === "admin" ? "Support: " : "You: "}
                          {t.lastMessage.text}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted">
                        <span className="font-mono">{t.code}</span> · {t.categoryLabel} · updated {formatDateTime(t.updatedAt)}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={LifeBuoy} title="No tickets yet" description="If something isn't working, or you have a question about your plan, bookings or payouts, open a ticket." />
        )}
      </Card>
    </>
  );
}
