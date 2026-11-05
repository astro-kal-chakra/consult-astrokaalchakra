import { Globe, Info } from "lucide-react";
import { requireAstrologer } from "@/lib/auth/guard";
import { getProfile } from "@/lib/data/astro";
import { formatDateTime } from "@/lib/format";
import { Badge, Card, CardHeader, InfoList, PageHeader } from "@/components/ui";
import { ProfileForm } from "./ProfileForm";

export const metadata = { title: "Personal profile" };

const STATUS = {
  draft: { label: "Draft", tone: "neutral", text: "Not submitted yet. Complete your profile and submit it for approval." },
  pending: { label: "In review", tone: "warning", text: "Our team is reviewing your profile. Your page goes live once it is approved." },
  approved: { label: "Approved", tone: "success", text: "Your profile is approved." },
  rejected: { label: "Changes needed", tone: "danger", text: "Please update your profile and submit it again." },
};

export default async function ProfilePage() {
  const { id } = await requireAstrologer();
  const { profile, approval, slug } = await getProfile(id);
  const st = STATUS[approval.status] || STATUS.draft;

  return (
    <>
      <PageHeader title="Personal profile" description="Your public profile on your personal consultation page." />

      <p className="mb-6 flex items-start gap-2 rounded-xl border border-line bg-surface-muted px-4 py-3 text-sm text-muted">
        <Info className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
        This profile is separate from your marketplace profile; changing it does not change your marketplace profile.
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <ProfileForm profile={profile} approvalStatus={approval.status} />

        <div className="space-y-6">
          <Card>
            <CardHeader title="Approval" action={<Badge tone={st.tone}>{st.label}</Badge>} />
            <div className="space-y-4 p-5">
              <p className="text-sm text-muted">{approval.status === "rejected" && approval.note ? approval.note : st.text}</p>
              <InfoList
                className="sm:grid-cols-1"
                items={[
                  { label: "Submitted", value: approval.submittedAt ? formatDateTime(approval.submittedAt) : null },
                  { label: "Reviewed", value: approval.reviewedAt ? formatDateTime(approval.reviewedAt) : null },
                ]}
              />
            </div>
          </Card>

          <Card className="p-5">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Globe className="size-4 text-accent" aria-hidden /> Your page address
            </p>
            <p className="mt-2 rounded-lg bg-surface-muted px-3 py-2 font-mono text-xs break-all">consult.astrokaalchakra.com/{slug}</p>
            <p className="mt-2 text-xs text-muted">Goes live once your subscription is active and your profile is approved.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
