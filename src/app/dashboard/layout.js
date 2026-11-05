import { requireAstrologer } from "@/lib/auth/guard";
import { getEligibility } from "@/lib/data/astro";
import { Shell } from "@/components/layout/Shell";
import { StatusBanner } from "@/components/layout/StatusBanner";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }) {
  const { id, account } = await requireAstrologer();
  const eligibility = await getEligibility(id);
  return (
    <Shell account={account} banner={<StatusBanner eligibility={eligibility} account={account} />}>
      {children}
    </Shell>
  );
}
