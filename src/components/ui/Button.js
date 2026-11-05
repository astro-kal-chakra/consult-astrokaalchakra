import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

const VARIANTS = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-600/60",
  outline: "border border-line bg-surface text-fg hover:border-brand-400 hover:text-accent",
  ghost: "text-fg hover:bg-surface-muted",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/60",
  soft: "bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-900/40 dark:text-brand-200 dark:hover:bg-brand-900/60",
};
const SIZES = { sm: "h-8 px-3 text-sm gap-1.5", md: "h-10 px-4 text-sm gap-2", lg: "h-12 px-5 text-base gap-2" };

export function buttonClasses({ variant = "primary", size = "md", className } = {}) {
  return cn(
    "inline-flex items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed [&_svg]:size-4 [&_svg]:shrink-0",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({ variant, size, className, loading, disabled, children, type = "button", ...rest }) {
  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={buttonClasses({ variant, size, className })} {...rest}>
      {loading && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function ButtonLink({ href, variant, size, className, children, ...rest }) {
  return (
    <Link href={href} className={buttonClasses({ variant, size, className })} {...rest}>
      {children}
    </Link>
  );
}
