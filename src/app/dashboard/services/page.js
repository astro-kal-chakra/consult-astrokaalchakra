import { ShieldCheck } from "lucide-react";
import { requireAstrologer } from "@/lib/auth/guard";
import { getServices, getUsage } from "@/lib/data/astro";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { UsageMeters } from "@/components/UsageMeters";
import { ServicesForm } from "./ServicesForm";

export const metadata = { title: "Services & fees" };

export default async function ServicesPage() {
  const { id } = await requireAstrologer();
  const { limits, ...services } = await getServices(id);
  const usage = await getUsage(id);

  return (
    <>
      <PageHeader title="Services & fees" description="What customers can book on your personal page, and your per-minute prices." />
      <p className="mb-6 flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-200">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        These are your personal-page prices. Your Astro Kaal Chakra marketplace prices stay exactly as they are.
      </p>
      <Card className="mb-6">
        <CardHeader title="Sessions left in your plan" description="When a type's limit is used up, customers can't book or start it until your next period starts." />
        <div className="p-5">
          <UsageMeters usage={usage} compact />
        </div>
      </Card>
      <ServicesForm services={services} limits={limits} />
    </>
  );
}
