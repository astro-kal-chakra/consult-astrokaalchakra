"use client";

import { useState } from "react";
import { ReceiptText } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDateTime, rupees } from "@/lib/format";

const TABS = [
  { key: "all", label: "All" },
  { key: "credit", label: "Credits" },
  { key: "debit", label: "Debits" },
];

/** Earnings ledger with All / Credits / Debits filter. */
export function Ledger({ entries }) {
  const [tab, setTab] = useState("all");
  const rows = tab === "all" ? entries : entries.filter((e) => e.type === tab);
  return (
    <>
      <div className="flex gap-1 border-b border-line px-5 pt-2" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn("-mb-px border-b-2 px-3 py-2 text-sm", tab === t.key ? "border-brand-600 font-medium text-accent" : "border-transparent text-muted hover:text-fg")}
          >
            {t.label}
          </button>
        ))}
      </div>
      {rows.length ? (
        <ul className="divide-y divide-line">
          {rows.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-5 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{e.description}</p>
                <p className="text-xs text-muted">
                  {formatDateTime(e.createdAt)} · <span className="font-mono">{e.ref}</span>
                </p>
              </div>
              <span className={cn("font-semibold tabular-nums", e.type === "credit" ? "text-green-700 dark:text-green-400" : "text-fg")}>
                {e.type === "credit" ? "+" : "−"}
                {rupees(e.amount, { decimals: true })}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={ReceiptText} title="Nothing here yet" />
      )}
    </>
  );
}
