import { MessageCircle, Phone, Timer, Video } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";

const MODES = [
  { key: "chat", label: "Chat sessions", icon: MessageCircle },
  { key: "audio", label: "Voice call sessions", icon: Phone },
  { key: "video", label: "Video call sessions", icon: Video },
];

/** Sessions used / booked / left in the current period, per type. `usage` from getUsage(). */
export function UsageMeters({ usage, compact = false }) {
  if (!usage?.period) return <p className="text-sm text-muted">No active plan. Buy a plan to get chat, voice and video sessions.</p>;
  return (
    <div className="space-y-4">
      <div className={cn("grid gap-4", compact ? "sm:grid-cols-3" : "md:grid-cols-3")}>
        {MODES.map(({ key, label, icon: Icon }) => {
          const q = usage.modes[key];
          const pctUsed = q.limit ? Math.min(100, (q.used / q.limit) * 100) : 100;
          const pctReserved = q.limit ? Math.min(100 - pctUsed, (q.reserved / q.limit) * 100) : 0;
          return (
            <div key={key} className="rounded-xl border border-line p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="size-4 text-accent" aria-hidden /> {label}
                </span>
                {q.full ? (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">Limit reached</span>
                ) : q.left <= Math.max(2, Math.ceil(q.limit * 0.1)) ? (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Running low</span>
                ) : null}
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {q.left}
                <span className="text-sm font-normal text-muted"> of {q.limit} left</span>
              </p>
              <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-surface-muted" role="img" aria-label={`${q.used} used, ${q.reserved} booked, ${q.left} left of ${q.limit}`}>
                <span className={cn("h-full", q.full ? "bg-red-500" : "bg-brand-500")} style={{ width: `${pctUsed}%` }} />
                <span className="h-full bg-brand-300 dark:bg-brand-700" style={{ width: `${pctReserved}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {q.used} used · {q.reserved} booked
              </p>
            </div>
          );
        })}
      </div>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1">
          <Timer className="size-3.5" aria-hidden /> Each session can last up to {usage.maxSessionMinutes} minutes
        </span>
        <span>
          Limits reset on {formatDate(usage.period.endsAt)} when your next period starts · unused sessions don&apos;t carry over
        </span>
      </p>
    </div>
  );
}
