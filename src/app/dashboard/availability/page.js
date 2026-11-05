import { requireAstrologer } from "@/lib/auth/guard";
import { getAvailability } from "@/lib/data/astro";
import { PageHeader } from "@/components/ui";
import { AvailabilityForm } from "./AvailabilityForm";

export const metadata = { title: "Availability" };

export default async function AvailabilityPage() {
  const { id } = await requireAstrologer();
  const availability = await getAvailability(id);
  return (
    <>
      <PageHeader title="Availability" description="When customers can book personal consultations. Your marketplace availability is separate." />
      <AvailabilityForm availability={availability} />
    </>
  );
}
