import { cn } from "@/lib/cn";

export function PageHeader({ title, description, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, sub, className }) {
  return (
    <div className={cn("rounded-2xl border border-line bg-surface p-4 shadow-sm shadow-brand-900/5", className)}>
      <div className="flex items-center gap-2 text-sm text-muted">
        {Icon && (
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
            <Icon className="size-4" aria-hidden />
          </span>
        )}
        {label}
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {Icon && (
        <span className="flex size-12 items-center justify-center rounded-full bg-surface-muted text-muted">
          <Icon className="size-6" aria-hidden />
        </span>
      )}
      <p className="mt-3 font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Small "label: value" list for detail cards. */
export function InfoList({ items, className }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-3 sm:grid-cols-2", className)}>
      {items
        .filter((i) => i && i.value !== undefined && i.value !== null && i.value !== "")
        .map((i) => (
          <div key={i.label} className="min-w-0">
            <dt className="text-xs text-muted">{i.label}</dt>
            <dd className="mt-0.5 text-sm font-medium break-words">{i.value}</dd>
          </div>
        ))}
    </dl>
  );
}
