import { cn } from "@/lib/cn";

export const inputClasses =
  "h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-fg placeholder:text-muted focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-red-500";

export function Field({ label, htmlFor, hint, error, className, children }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium">
          {label}
        </label>
      )}
      {children}
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export const Input = ({ className, ...rest }) => <input className={cn(inputClasses, className)} {...rest} />;

export const Select = ({ className, children, ...rest }) => (
  <select className={cn(inputClasses, "pr-8", className)} {...rest}>
    {children}
  </select>
);

export const Textarea = ({ className, ...rest }) => <textarea className={cn(inputClasses, "h-auto min-h-24 resize-y py-2.5", className)} {...rest} />;
