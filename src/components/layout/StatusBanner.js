import Link from "next/link";
import { AlertTriangle, Clock4, Info, PauseCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";

/**
 * The one most important thing blocking the personal service, shown under the top bar on every page.
 * Order matters: subscription first (nothing works without it), then approval, then the on/off switch.
 */
export function StatusBanner({ eligibility, account }) {
  const sub = eligibility.subscription;
  const approval = eligibility.approval;
  let b = null;
  if (account.saasStatus === "suspended") b = { tone: "danger", icon: AlertTriangle, title: "Your personal service is suspended", text: "Contact Astro Kaal Chakra support to reactivate it. Your marketplace profile is not affected." };
  else if (sub.status === "expired") b = { tone: "danger", icon: AlertTriangle, title: "Your subscription has expired", text: "Your personal consultation service is offline and new bookings are paused. Renew to go live again. Your followers, history and earnings are kept.", cta: { href: "/dashboard/subscription", label: "Renew now" } };
  else if (sub.status === "none") b = { tone: "info", icon: Info, title: "Start your personal consultation page", text: "Choose a plan to get your own page with your own prices, bookings and followers.", cta: { href: "/dashboard/subscription", label: "See plans" } };
  else if (sub.status === "scheduled") b = { tone: "info", icon: Clock4, title: "Your plan starts soon", text: `Your paid period starts on ${formatDate(sub.queued[0].startsAt)}.` };
  else if (approval.status === "pending") b = { tone: "warning", icon: Clock4, title: "Profile in review", text: "Our team is reviewing your personal profile. Your page goes live as soon as it is approved." };
  else if (approval.status === "rejected") b = { tone: "danger", icon: AlertTriangle, title: "Profile changes needed", text: approval.note || "Please update your personal profile and submit it again.", cta: { href: "/dashboard/profile", label: "Update profile" } };
  else if (approval.status === "draft") b = { tone: "warning", icon: Info, title: "Complete your personal profile", text: "Fill in your public profile and submit it for approval to go live.", cta: { href: "/dashboard/profile", label: "Complete profile" } };
  else if (!account.personalEnabled) b = { tone: "warning", icon: PauseCircle, title: "Personal consultations are switched off", text: "Customers can see your page but can't book. Switch them on in Settings.", cta: { href: "/dashboard/settings", label: "Open settings" } };
  else if (sub.status === "active" && sub.daysLeft <= 5 && !sub.queued.length) b = { tone: "warning", icon: Clock4, title: `Subscription ends in ${sub.daysLeft} day${sub.daysLeft === 1 ? "" : "s"}`, text: "Buy your next period now. It starts automatically when this one ends.", cta: { href: "/dashboard/subscription", label: "Renew" } };
  if (!b) return null;

  const Icon = b.icon;
  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-center gap-3 border-b px-4 py-3 text-sm sm:px-6",
        b.tone === "danger" && "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200",
        b.tone === "warning" && "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200",
        b.tone === "info" && "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-200",
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1">
        <span className="font-semibold">{b.title}.</span> {b.text}
      </p>
      {b.cta && (
        <Link href={b.cta.href} className="rounded-lg bg-white/70 px-3 py-1.5 text-xs font-semibold hover:bg-white dark:bg-white/10 dark:hover:bg-white/20">
          {b.cta.label}
        </Link>
      )}
    </div>
  );
}
