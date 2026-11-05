import { BellRing, Landmark, LogOut, UserRound } from "lucide-react";
import { requireAstrologer } from "@/lib/auth/guard";
import { getAccount, getSettings } from "@/lib/data/astro";
import { Badge, Card, CardHeader, InfoList, PageHeader } from "@/components/ui";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { NotificationSettings, PersonalSwitch } from "./SettingsControls";

export const metadata = { title: "Settings" };

const reminderLabel = (m) => (m >= 1440 ? `${m / 1440 === 1 ? "24 hours" : `${m / 1440} days`}` : m >= 60 ? `${m / 60} hour${m === 60 ? "" : "s"}` : `${m} minutes`);
const maskPhone = (p) => `+91 ${String(p).slice(0, 2)}XXXXXX${String(p).slice(-2)}`;

export default async function SettingsPage() {
  const { id } = await requireAstrologer();
  const account = await getAccount(id);
  const settings = await getSettings(id);
  const pm = settings.payoutMethod;

  return (
    <>
      <PageHeader title="Settings" description="Preferences for your personal consultation service." />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <PersonalSwitch enabled={account.personalEnabled} />
          <NotificationSettings notifications={settings.notifications} />
          <Card className="p-5">
            <p className="flex items-center gap-2 font-semibold">
              <BellRing className="size-4 text-accent" aria-hidden /> Session reminders
            </p>
            <p className="mt-1 text-sm text-muted">
              Sent to you and the customer {settings.reminderMinutes.map(reminderLabel).join(", ")} before each booked session, by push notification and in the app.
            </p>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Payout method" action={pm?.verified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Not verified</Badge>} />
            <div className="space-y-4 p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-surface-muted text-accent">
                  <Landmark className="size-5" aria-hidden />
                </span>
                <InfoList
                  className="flex-1"
                  items={[
                    { label: "Account holder", value: pm?.holder },
                    { label: "Account", value: pm?.accountMasked },
                    { label: "IFSC", value: pm?.ifsc },
                  ]}
                />
              </div>
              <p className="text-xs text-muted">Bank details are managed in your verified KYC; contact support to change.</p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Account" action={<Badge tone={account.saasStatus === "active" ? "success" : "danger"}>{account.saasStatus === "active" ? "Active" : "Suspended"}</Badge>} />
            <div className="flex items-center gap-3 p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-surface-muted text-accent">
                <UserRound className="size-5" aria-hidden />
              </span>
              <InfoList
                className="flex-1"
                items={[
                  { label: "Name", value: account.displayName },
                  { label: "Mobile", value: maskPhone(account.phone) },
                ]}
              />
            </div>
          </Card>

          <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="font-semibold">Appearance</p>
              <p className="text-sm text-muted">Light, dark or follow your device.</p>
            </div>
            <ThemeToggle />
          </Card>

          <a href="/logout" className="inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:underline dark:text-red-400">
            <LogOut className="size-4" aria-hidden /> Sign out
          </a>
        </div>
      </div>
    </>
  );
}
