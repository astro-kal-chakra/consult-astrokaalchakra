"use client";

import { cn } from "@/lib/cn";

/** Accessible on/off switch (controlled: checked + onChange). */
export function Switch({ checked, onChange, disabled, label, id }) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={Boolean(checked)}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-brand-600" : "bg-line",
      )}
    >
      <span className={cn("inline-block size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5" : "translate-x-0.5")} />
    </button>
  );
}
