import { Clock3, IndianRupee, Info, Landmark, Wallet } from "lucide-react";
import { requireAstrologer } from "@/lib/auth/guard";
import { getEarnings } from "@/lib/data/astro";
import { formatDate, rupees } from "@/lib/format";
import { Badge, Card, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { Ledger } from "./Ledger";
import { PayoutRequest } from "./PayoutRequest";

export const metadata = { title: "Earnings & payouts" };

const PAYOUT_STATUS = {
  requested: { label: "In review", tone: "warning" },
  approved: { label: "Approved", tone: "info" },
  paid: { label: "Paid", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
};

export default async function EarningsPage() {
  const { id } = await requireAstrologer();
  const e = await getEarnings(id);

  return (
    <>
      <PageHeader
        title="Earnings & payouts"
        description="Personal consultation earnings, with no platform commission. Separate from your marketplace earnings."
        action={<PayoutRequest balance={e.balance} rules={e.rules} method={e.payoutMethod} />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Wallet} label="Available balance" value={rupees(e.balance)} />
        <StatCard icon={IndianRupee} label="Lifetime earned" value={rupees(e.lifetime)} />
        <StatCard icon={Landmark} label="Paid out (net)" value={rupees(e.paidOut)} />
        <StatCard icon={Clock3} label="Pending requests" value={rupees(e.pending)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="min-w-0">
          <CardHeader title="Payout requests" />
          {e.payouts.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs text-muted">
                  <tr className="border-b border-line">
                    <th className="px-5 py-2 font-medium">Request</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                    <th className="px-3 py-2 text-right font-medium">TDS</th>
                    <th className="px-3 py-2 text-right font-medium">GST</th>
                    <th className="px-3 py-2 text-right font-medium">Net</th>
                    <th className="px-5 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {e.payouts.map((p) => (
                    <tr key={p.id} className="align-top">
                      <td className="px-5 py-2.5">
                        <p className="font-mono text-xs">{p.code}</p>
                        <p className="text-xs text-muted">{formatDate(p.requestedAt)}</p>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{rupees(p.amount, { decimals: true })}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{rupees(p.tds, { decimals: true })}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{rupees(p.gst, { decimals: true })}</td>
                      <td className="px-3 py-2.5 text-right font-medium tabular-nums">{rupees(p.net, { decimals: true })}</td>
                      <td className="px-5 py-2.5">
                        <Badge tone={PAYOUT_STATUS[p.status]?.tone}>{PAYOUT_STATUS[p.status]?.label ?? p.status}</Badge>
                        {p.paidAt && (
                          <p className="mt-0.5 text-xs text-muted">
                            {formatDate(p.paidAt)}
                            {p.utr ? ` · UTR ${p.utr}` : ""}
                          </p>
                        )}
                        {p.remarks && <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">{p.remarks}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={Landmark} title="No payout requests yet" />
          )}
        </Card>

        <Card className="h-fit p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <Info className="size-4 text-accent" aria-hidden /> How payouts work
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>Requests are reviewed by the Astro Kaal Chakra team.</li>
            <li>TDS ({e.rules.tdsPercent}%) is deducted from every payout.</li>
            <li>
              GST ({e.rules.gstPercent}%) is deducted once your personal earnings in the financial year go above {rupees(e.rules.gstThresholdFy)}.
            </li>
            <li>Money is paid to your verified bank account. Minimum payout {rupees(e.rules.minPayout)}.</li>
            <li>No platform commission on personal consultations.</li>
          </ul>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Earnings ledger" description="Every credit and debit on your personal earnings." />
        <Ledger entries={e.ledger} />
      </Card>
    </>
  );
}
