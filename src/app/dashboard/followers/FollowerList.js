"use client";

import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { EmptyState, Input } from "@/components/ui";
import { timeAgo } from "@/lib/format";

export function FollowerList({ followers }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? followers.filter((f) => f.name.toLowerCase().includes(t) || (f.city || "").toLowerCase().includes(t)) : followers;
  }, [q, followers]);

  return (
    <>
      <div className="border-b border-line p-4">
        <label className="relative block">
          <span className="sr-only">Search followers</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or city" className="pl-9" />
        </label>
      </div>
      {shown.length ? (
        <ul className="divide-y divide-line">
          {shown.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-5 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200" aria-hidden>
                {f.name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.name}</p>
                <p className="text-xs text-muted">{f.city}</p>
              </div>
              <p className="text-xs text-muted">Followed {timeAgo(f.followedAt)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={Users} title={followers.length ? "No matches" : "No followers yet"} description={followers.length ? "Try another name or city." : "People who follow your personal page appear here."} />
      )}
    </>
  );
}
