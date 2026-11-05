import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, BadgeCheck, Briefcase, Languages, MapPin, Radio, Star } from "lucide-react";
import { optionalCustomer } from "@/lib/auth/guard";
import { getPublicPage, getSlotsByDuration, myLiveSessions, similarAstrologers } from "@/lib/data/customer-data";
import { AstrologerCard } from "@/components/site/AstrologerCard";
import { RememberAstrologer } from "@/components/site/RememberAstrologer";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { MODES } from "@/lib/modes";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui";
import { BookingPanel, ConsultOptions, FollowButton } from "./PageActions";

const cleanSlug = (s) => String(s || "").replace(/[^a-z0-9-]/gi, "").slice(0, 80);

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = await getPublicPage(cleanSlug(slug));
  if (!p) return { title: "Not found" };
  return {
    title: `${p.profile.displayName} | Personal consultation`,
    description: p.profile.headline || `Book a personal consultation with ${p.profile.displayName}.`,
    robots: { index: p.available, follow: true },
  };
}

const PRESENCE = { online: { label: "Online", dot: "bg-online" }, busy: { label: "Busy", dot: "bg-busy" }, offline: { label: "Offline", dot: "bg-offline" } };
const initials = (n) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

function Stars({ value, className }) {
  return (
    <span className={cn("inline-flex text-amber-500", className)} aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("size-3.5", n <= value ? "fill-current" : "text-line")} aria-hidden />
      ))}
    </span>
  );
}

export default async function PersonalPage({ params }) {
  const { slug: raw } = await params;
  const slug = cleanSlug(raw);
  const cid = await optionalCustomer();
  const p = await getPublicPage(slug, cid);
  if (!p) notFound();
  const slotsByDuration = p.available ? await getSlotsByDuration(slug) : {};
  const live = cid ? (await myLiveSessions(cid)).filter((s) => (s.slug ? s.slug === slug : s.astrologer === p.profile.displayName)) : [];
  const pres = PRESENCE[p.presence];
  const prof = p.profile;
  const maxCount = Math.max(1, ...p.rating.distribution.map((d) => d.count));
  const similar = await similarAstrologers(slug, 3);

  return (
    <div className="space-y-6">
      <RememberAstrologer slug={slug} />
      {live.map((s) => (
        <Link key={s.id} href={`/session/${s.id}`} className="flex items-center gap-3 rounded-2xl border border-brand-300 bg-brand-50 px-4 py-3 text-sm dark:border-brand-800 dark:bg-brand-950/40">
          <Radio className="size-5 shrink-0 text-brand-600" aria-hidden />
          <span className="flex-1">{s.status === "waiting" ? "Your request is waiting for the astrologer to accept." : "Your consultation is in progress."}</span>
          <span className="font-semibold text-accent">Open</span>
        </Link>
      ))}

      {!p.available && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>
            <span className="font-semibold">{p.unavailableReason}</span> You can still follow and read reviews.
          </p>
        </div>
      )}

      {/* Hero */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="relative shrink-0 self-start">
            {prof.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- astrologer photo from our own storage
              <img src={prof.photoUrl} alt={prof.displayName} className="size-24 rounded-full object-cover" />
            ) : (
              <span className="flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 font-display text-3xl text-white">{initials(prof.displayName)}</span>
            )}
            <span className={cn("absolute right-1 bottom-1 size-4 rounded-full ring-2 ring-surface", pres.dot)} title={pres.label} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl sm:text-3xl">{prof.displayName}</h1>
              <BadgeCheck className="size-5 text-brand-600" aria-label="Verified astrologer" />
              <Badge tone={p.presence === "online" ? "success" : p.presence === "busy" ? "warning" : "neutral"}>
                <span className={cn("size-1.5 rounded-full", pres.dot)} aria-hidden /> {pres.label}
              </Badge>
            </div>
            {prof.headline && <p className="mt-1 text-muted">{prof.headline}</p>}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              {p.rating.count > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="size-4 fill-amber-500 text-amber-500" aria-hidden /> <span className="font-medium text-fg">{p.rating.average}</span> ({p.rating.count} reviews)
                </span>
              )}
              {prof.experienceYears > 0 && (
                <span className="flex items-center gap-1">
                  <Briefcase className="size-4" aria-hidden /> {prof.experienceYears}+ years
                </span>
              )}
              {prof.languages?.length > 0 && (
                <span className="flex items-center gap-1">
                  <Languages className="size-4" aria-hidden /> {prof.languages.join(", ")}
                </span>
              )}
              {prof.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-4" aria-hidden /> {prof.city}
                </span>
              )}
            </div>
            {prof.expertise?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {prof.expertise.map((e) => (
                  <Badge key={e} tone="brand">
                    {e}
                  </Badge>
                ))}
              </div>
            )}
            <div className="mt-4">
              <FollowButton slug={slug} following={p.following} followers={p.followers} />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          {p.available && (
            <Card id="book" className="scroll-mt-24">
              <CardHeader title="Book a time" description="Choose how long, then an available time · times in IST" />
              <div className="p-5">
                <BookingPanel slug={slug} services={p.services} durations={p.durations} slotsByDuration={slotsByDuration} />
              </div>
            </Card>
          )}

          {prof.bio && (
            <Card>
              <CardHeader title="About" />
              <p className="p-5 text-sm leading-relaxed whitespace-pre-line">{prof.bio}</p>
            </Card>
          )}

          <Card>
            <CardHeader title="Reviews" description={p.rating.count ? `${p.rating.average} average from ${p.rating.count} reviews` : undefined} />
            {p.rating.count > 0 && (
              <div className="space-y-1.5 border-b border-line px-5 py-4">
                {p.rating.distribution.map((d) => (
                  <div key={d.stars} className="flex items-center gap-2 text-xs">
                    <span className="w-6 text-muted">{d.stars}★</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
                      <span className="block h-full bg-amber-500" style={{ width: `${(d.count / maxCount) * 100}%` }} />
                    </span>
                    <span className="w-5 text-right text-muted tabular-nums">{d.count}</span>
                  </div>
                ))}
              </div>
            )}
            {p.reviews.length ? (
              <ul className="divide-y divide-line">
                {p.reviews.map((r) => (
                  <li key={r.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{r.name}</span>
                      <Stars value={r.rating} />
                      <span className="text-xs text-muted">{formatDate(r.at)}</span>
                    </div>
                    {r.text && <p className="mt-1 text-sm text-muted">{r.text}</p>}
                    {r.reply && (
                      <p className="mt-2 rounded-xl bg-surface-muted px-3 py-2 text-sm">
                        <span className="font-medium">Reply from {prof.displayName.split(" ")[0]}:</span> {r.reply.text}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Star} title="No reviews yet" description="Reviews from personal consultations appear here." />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card id="consult" className="scroll-mt-24 lg:sticky lg:top-20">
            <CardHeader title="Consult" description={p.talkNow ? "Available now. Start instantly" : "Book a time, or talk instantly when online"} />
            <div className="p-5">
              {p.available ? (
                <ConsultOptions slug={slug} services={p.services} talkNow={p.talkNow} maxSessionMinutes={p.maxSessionMinutes} />
              ) : (
                <div className="space-y-2">
                  {Object.entries(MODES).map(([m, M]) =>
                    p.services[m]?.enabled ? (
                      <p key={m} className="flex items-center gap-2 text-sm text-muted">
                        <M.icon className="size-4" aria-hidden /> {M.label}: not available right now
                      </p>
                    ) : null,
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {similar.length > 0 && (
        <section aria-labelledby="similar-heading">
          <div className="mb-3 flex items-end justify-between gap-2">
            <div>
              <h2 id="similar-heading" className="font-display text-xl">
                Similar astrologers
              </h2>
              <p className="text-sm text-muted">Verified astrologers with an active personal page and similar expertise.</p>
            </div>
            <Link href="/?all=1" className="text-sm text-accent hover:underline">
              See all
            </Link>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {similar.map((a) => (
              <li key={a.slug}>
                <AstrologerCard a={a} shared={a.shared} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
