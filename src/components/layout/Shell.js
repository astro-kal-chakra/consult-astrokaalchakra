"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/Toast";
import { changePresence } from "@/app/dashboard/actions";
import { NAV } from "./nav";
import { ThemeToggle } from "./ThemeToggle";

const PRESENCE = {
  online: { label: "Online", dot: "bg-online" },
  busy: { label: "Busy", dot: "bg-busy" },
  offline: { label: "Offline", dot: "bg-offline" },
};

function Sidebar({ onNavigate }) {
  const path = usePathname();
  return (
    <nav aria-label="Dashboard" className="flex flex-col gap-0.5 p-3">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/dashboard" ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
              active ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-200" : "text-muted hover:bg-surface-muted hover:text-fg",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden /> {label}
          </Link>
        );
      })}
    </nav>
  );
}

function PresenceControl({ presence, canConsult }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const set = (p) =>
    start(async () => {
      const r = await changePresence(p);
      if (!r.ok) toast(r.error.message, { type: "error" });
      else toast(`Personal service is ${PRESENCE[p].label.toLowerCase()}`);
    });
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-muted lg:inline">Personal service</span>
      <div className="inline-flex rounded-xl border border-line bg-surface p-0.5" role="radiogroup" aria-label="Personal service status">
        {Object.entries(PRESENCE).map(([key, p]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={presence === key}
            disabled={pending || (!canConsult && key !== "offline")}
            onClick={() => set(key)}
            title={!canConsult && key !== "offline" ? "Complete every activation step first" : undefined}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-muted transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              presence === key && "bg-surface-muted text-fg",
            )}
          >
            <span className={cn("size-2 rounded-full", p.dot)} aria-hidden />
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Shell({ account, banner, children }) {
  const [open, setOpen] = useState(false);
  const brand = (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-4 py-4">
      <Image src="/images/logo-mark.png" alt="" width={34} height={34} className="size-8.5" />
      <span className="leading-tight">
        <span className="block font-display text-lg">Astro Kaal Chakra</span>
        <span className="block text-[11px] tracking-wide text-accent uppercase">Consult</span>
      </span>
    </Link>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col overflow-y-auto border-r border-line bg-surface lg:flex">
        {brand}
        <Sidebar />
        <div className="mt-auto border-t border-line p-4 text-xs text-muted">
          Your personal service is separate from your Astro Kaal Chakra marketplace profile, prices and earnings.
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/45" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[85%] flex-col overflow-y-auto bg-surface shadow-xl">
            <div className="flex items-center justify-between pr-3">
              {brand}
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-full p-2 text-muted hover:bg-surface-muted">
                <X className="size-5" />
              </button>
            </div>
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-line bg-surface/90 px-4 py-3 backdrop-blur sm:px-6">
          <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-xl p-2 text-muted hover:bg-surface-muted lg:hidden">
            <Menu className="size-5" />
          </button>
          {account.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- the astrologer's own photo
            <img src={account.photoUrl} alt="" className="size-10 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-900/50 dark:text-brand-200" aria-hidden>
              {(account.displayName || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("")}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{account.displayName}</p>
            {account.canConsult ? (
              <a href={`/${account.slug}`} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 truncate text-xs text-accent hover:underline">
                {account.publicUrl} <ExternalLink className="size-3 shrink-0" aria-hidden />
              </a>
            ) : (
              <p className="truncate text-xs text-muted">Personal page not live yet</p>
            )}
          </div>
          <PresenceControl presence={account.presence} canConsult={account.canConsult} />
          <ThemeToggle className="hidden sm:inline-flex" />
          <a href="/logout" className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm text-muted hover:bg-surface-muted hover:text-fg" title="Sign out">
            <LogOut className="size-4" aria-hidden /> <span className="hidden sm:inline">Sign out</span>
          </a>
        </header>
        {banner}
        <main className="container-page flex-1 py-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
