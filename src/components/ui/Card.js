import { cn } from "@/lib/cn";

export function Card({ className, children, ...rest }) {
  return (
    <div className={cn("rounded-2xl border border-line bg-surface shadow-sm shadow-brand-900/5", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action, className }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4", className)}>
      <div className="min-w-0">
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
