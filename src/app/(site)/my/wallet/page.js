import { Receipt, Wallet } from "lucide-react";
import { requireCustomer } from "@/lib/auth/guard";
import { getWallet } from "@/lib/data/customer-data";
import { formatDateTime, rupees } from "@/lib/format";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: "Wallet" };
export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const { id } = await requireCustomer("/my/wallet");
  const w = await getWallet(id);

  return (
    <>
      <PageHeader title="Wallet" />
      <Card className="mb-6 p-6">
        <div className="flex items-center gap-3 text-sm text-muted">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
            <Wallet className="size-5" aria-hidden />
          </span>
          Available balance
        </div>
        <p className="mt-3 text-4xl font-semibold tabular-nums">{rupees(w.balance, { decimals: true })}</p>
        <p className="mt-3 text-sm text-muted">
          This is your Astro Kaal Chakra wallet, with the same balance as the app and website. Recharge it in the app or on the website.
        </p>
      </Card>

      <Card>
        <CardHeader title="Personal consultation charges" description="Charged per minute during each session. Nothing is charged at booking." />
        {w.transactions.length ? (
          <ul className="divide-y divide-line">
            {w.transactions.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-muted">
                    <span className="font-mono">{t.ref}</span> · {formatDateTime(t.at)}
                  </p>
                </div>
                <p className={t.type === "debit" ? "font-semibold tabular-nums text-red-600 dark:text-red-400" : "font-semibold tabular-nums text-green-600 dark:text-green-400"}>
                  {t.type === "debit" ? "−" : "+"}
                  {rupees(t.amount, { decimals: true })}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Receipt} title="No charges yet" description="Charges for your personal consultations will show here." />
        )}
      </Card>
    </>
  );
}
