import { Hourglass } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui";

/** Shown (live backend only) on pages whose backend part is still being built, instead of demo data. */
export function LiveSoon({ title }) {
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <EmptyState icon={Hourglass} title="Connecting in the next step" description="This page is being connected to the live system. Your profile, services, availability, settings and subscription already work." />
      </Card>
    </>
  );
}
