"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";

const KEY = "kc-consult-theme";
const OPTIONS = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
];

const listeners = new Set();
const read = () => {
  try {
    return localStorage.getItem(KEY) || "system";
  } catch {
    return "system";
  }
};
const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

function apply(value) {
  try {
    localStorage.setItem(KEY, value);
  } catch {}
  const dark = value === "dark" || (value === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  listeners.forEach((l) => l());
}

export function ThemeToggle({ className }) {
  const value = useSyncExternalStore(subscribe, read, () => "system");
  return (
    <div className={cn("inline-flex rounded-xl border border-line bg-surface p-0.5", className)} role="radiogroup" aria-label="Theme">
      {OPTIONS.map(({ value: v, icon: Icon, label }) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          aria-label={label}
          title={label}
          onClick={() => apply(v)}
          className={cn("rounded-lg p-1.5 text-muted transition-colors", value === v && "bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200")}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
