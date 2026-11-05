import { cn } from "@/lib/cn";

const TONES = {
  neutral: "bg-surface-muted text-muted",
  brand: "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200",
  success: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  danger: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  info: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
};

export function Badge({ tone = "neutral", className, children }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", TONES[tone], className)}>{children}</span>;
}
