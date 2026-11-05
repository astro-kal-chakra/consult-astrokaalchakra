import Link from "next/link";
import { Star } from "lucide-react";
import { rupees } from "@/lib/format";
import { MODES } from "@/lib/modes";
import { cn } from "@/lib/cn";
import { Badge, Card } from "@/components/ui";

export const PRESENCE = { online: { label: "Online", dot: "bg-online" }, busy: { label: "Busy", dot: "bg-busy" }, offline: { label: "Offline", dot: "bg-offline" } };

export const initials = (n) =>
  String(n || "")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

/** Profile photo (`src`) or initials, with the online / busy / offline dot. */
export function Avatar({ name, src, presence, size = "md" }) {
  const p = PRESENCE[presence] || PRESENCE.offline;
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 dark:bg-brand-900/50 dark:text-brand-200",
        size === "lg" ? "size-20 text-2xl" : "size-14 text-lg",
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- astrologer photo from our own storage
        <img src={src} alt="" loading="lazy" className="size-full rounded-full object-cover" />
      ) : (
        initials(name)
      )}
      <span className={cn("absolute right-0 bottom-0 rounded-full border-2 border-surface", p.dot, size === "lg" ? "size-5" : "size-3.5")} aria-hidden />
    </span>
  );
}

/** Astrologer card for lists and "Similar astrologers". `shared`: expertise in common with the featured one. */
export function AstrologerCard({ a, shared }) {
  const p = PRESENCE[a.presence] || PRESENCE.offline;
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start gap-3">
        <Avatar name={a.name} src={a.photoUrl} presence={a.presence} />
        <div className="min-w-0 flex-1">
          <Link href={`/${a.slug}`} className="font-semibold hover:text-accent hover:underline">
            {a.name}
          </Link>
          <p className="line-clamp-2 text-xs text-muted">{a.headline}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
            <span>{p.label}</span>
            {a.rating && (
              <span className="inline-flex items-center gap-0.5">
                <Star className="size-3 fill-current text-amber-500" aria-hidden /> {a.rating} ({a.ratingCount})
              </span>
            )}
            <span>{a.experienceYears}+ yrs</span>
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {a.expertise.slice(0, 3).map((e) => (
          <Badge key={e} tone={shared?.includes(e) ? "brand" : "neutral"}>
            {e}
          </Badge>
        ))}
      </div>
      <ul className="mt-3 space-y-1 text-sm">
        {Object.entries(a.modes).map(([m, v]) => {
          const M = MODES[m];
          return (
            <li key={m} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-muted">
                <M.icon className="size-3.5" aria-hidden /> {M.label}
              </span>
              {v.available ? <span className="font-medium tabular-nums">{rupees(v.price)}/min</span> : <span className="text-xs text-muted">Not available now</span>}
            </li>
          );
        })}
      </ul>
      <div className="mt-auto flex gap-2 pt-4">
        <Link href={`/${a.slug}`} className="flex-1 rounded-xl border border-line px-3 py-2 text-center text-sm font-medium hover:border-brand-400">
          View profile
        </Link>
        <Link href={`/${a.slug}#book`} className="flex-1 rounded-xl bg-brand-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-brand-700">
          {a.talkNow ? "Talk / Book" : "Book"}
        </Link>
      </div>
    </Card>
  );
}
