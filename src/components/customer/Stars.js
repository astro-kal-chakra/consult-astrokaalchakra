"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

/** 1–5 star picker (radio group). */
export function StarPicker({ value, onChange, disabled }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          disabled={disabled}
          onClick={() => onChange(n)}
          className="rounded-md p-0.5 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Star className={cn("size-7 transition-colors", n <= value ? "fill-amber-400 text-amber-400" : "text-line")} />
        </button>
      ))}
    </div>
  );
}
