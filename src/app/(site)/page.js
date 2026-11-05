import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BadgeCheck, CalendarClock, Languages, MapPin, Search, ShieldCheck, Star, Users, Zap } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getPublicPage, listPublicAstrologers, myAstrologerSlug, myLiveSessions, nextAvailable, similarAstrologers } from "@/lib/data/customer-data";
import { formatDateTime, rupees } from "@/lib/format";
import { MODES } from "@/lib/modes";
import { cn } from "@/lib/cn";
import { Badge, Card, EmptyState, inputClasses } from "@/components/ui";
import { AstrologerCard, Avatar, PRESENCE } from "@/components/site/AstrologerCard";
import { LAST_ASTRO_COOKIE } from "@/components/site/RememberAstrologer";

export const metadata = { title: "Personal consultations" };
export const dynamic = "force-dynamic";

const cleanSlug = (s) => String(s || "").replace(/[^a-z0-9-]/gi, "").slice(0, 80);

/** The astrologer this visitor came for: ?astro=, the personal page they last opened, or their latest booking / follow. */
async function featuredSlug(sp, cid) {
  if (sp.all === "1") return null;
  let remembered = "";
  try {
    remembered = decodeURIComponent((await cookies()).get(LAST_ASTRO_COOKIE)?.value || "");
  } catch {
    remembered = ""; // a broken cookie must never break the home page
  }
  const candidates = [cleanSlug(sp.astro), cleanSlug(remembered), cid ? await myAstrologerSlug(cid) : null];
  // Only an astrologer whose personal page is live (verified + active subscription + approved + switched on)
  for (const s of candidates) if (s && (await getPublicPage(s))?.available) return s;
  return null;
}

async function Featured({ slug, cid }) {
  const p = await getPublicPage(slug, cid);
  const prof = p.profile;
  const pres = PRESENCE[p.presence] || PRESENCE.offline;
  const next = await nextAvailable(slug);
  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-brand-50 to-gold-100 px-5 py-6 sm:px-8 dark:from-brand-950/50 dark:to-brand-900/30">
        <p className="text-xs font-semibold tracking-wide text-accent uppercase">Your astrologer</p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
          <Avatar name={prof.displayName} src={prof.photoUrl} presence={p.presence} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="flex flex-wrap items-center gap-2 font-display text-2xl sm:text-3xl">
              {prof.displayName}
              <BadgeCheck className="size-6 text-brand-600" aria-label="Verified astrologer" />
            </h1>
            <p className="mt-1 text-sm text-muted">{prof.headline}</p>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <span className={cn("size-2.5 rounded-full", pres.dot)} aria-hidden /> {pres.label}
              </span>
              {p.rating.average && (
                <span className="inline-flex items-center gap-1">
                  <Star className="size-4 fill-current text-amber-500" aria-hidden /> {p.rating.average} ({p.rating.count} reviews)
                </span>
              )}
              <span>{prof.experienceYears}+ years</span>
              <span className="inline-flex items-center gap-1 text-muted">
                <Users className="size-4" aria-hidden /> {p.followers} followers
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          {prof.bio && <p className="text-sm leading-relaxed">{prof.bio}</p>}
          <div className="flex flex-wrap gap-1.5">
            {prof.expertise.map((e) => (
              <Badge key={e} tone="brand">
                {e}
              </Badge>
            ))}
          </div>
          <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Languages className="size-4" aria-hidden /> {prof.languages.join(", ")}
            </span>
            {prof.city && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden /> {prof.city}
              </span>
            )}
          </p>
          {next && (
            <p className="inline-flex items-center gap-2 rounded-xl bg-surface-muted px-3 py-2 text-sm">
              <CalendarClock className="size-4 text-accent" aria-hidden /> Next available: <span className="font-medium">{formatDateTime(next)}</span>
            </p>
          )}
        </div>

        <div className="space-y-3">
          <ul className="space-y-2 rounded-2xl border border-line p-4 text-sm">
            {Object.entries(MODES).map(([m, M]) =>
              p.services[m]?.enabled ? (
                <li key={m} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-muted">
                    <M.icon className="size-4" aria-hidden /> {M.label}
                  </span>
                  {p.services[m].available ? <span className="font-semibold tabular-nums">{rupees(p.services[m].price)}/min</span> : <span className="text-xs text-muted">Not available now</span>}
                </li>
              ) : null,
            )}
          </ul>
          {p.talkNow && (
            <Link href={`/${slug}#consult`} className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700">
              <Zap className="size-4" aria-hidden /> Talk now
            </Link>
          )}
          <Link href={`/${slug}#book`} className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
            <CalendarClock className="size-4" aria-hidden /> Book a session
          </Link>
          <Link href={`/${slug}`} className="block rounded-xl border border-line px-4 py-2.5 text-center text-sm font-medium hover:border-brand-400">
            View full profile &amp; reviews
          </Link>
        </div>
      </div>
    </Card>
  );
}

/**
 * Consult home. A customer usually arrives through one astrologer's personal link: that astrologer is
 * featured with full details, and the others are shown as "Similar astrologers". Without one (or with
 * ?all=1) it's the full list with search. Only astrologers whose personal page is live are ever listed.
 */
export default async function HomePage({ searchParams }) {
  const s = await getSession();
  if (s?.role === "astrologer") redirect("/dashboard");
  const cid = s?.role === "customer" ? s.id : null;
  const sp = await searchParams;
  const featured = await featuredSlug(sp, cid);
  const live = cid ? await myLiveSessions(cid) : [];

  const liveBanners = live.map((x) => (
    <Link key={x.id} href={`/session/${x.id}`} className="mb-4 flex items-center gap-2 rounded-xl border border-brand-300 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-200">
      <Zap className="size-4" aria-hidden />
      {x.status === "waiting" ? `Waiting for ${x.astrologer} to accept your ${MODES[x.mode].label.toLowerCase()}. Open` : `Your session with ${x.astrologer} is in progress. Join`}
    </Link>
  ));

  if (featured) {
    const similar = await similarAstrologers(featured, 6);
    return (
      <div className="space-y-8">
        <div>{liveBanners}</div>
        <Featured slug={featured} cid={cid} />
        {similar.length > 0 && (
          <section aria-labelledby="similar-heading">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id="similar-heading" className="font-display text-xl sm:text-2xl">
                  Similar astrologers
                </h2>
                <p className="text-sm text-muted">Other verified astrologers on personal consultations, with similar expertise.</p>
              </div>
              <Link href="/?all=1" className="text-sm text-accent hover:underline">
                Browse all
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
        <TrustNote />
      </div>
    );
  }

  // Full list with search (no featured astrologer, or "Browse all")
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";
  const mode = ["chat", "audio", "video"].includes(sp.mode) ? sp.mode : "";
  const online = sp.online === "1" ? "1" : "";
  const list = await listPublicAstrologers({ q, mode, online });

  return (
    <div>
      {liveBanners}
      <section className="rounded-3xl bg-gradient-to-br from-brand-50 to-gold-100 px-5 py-8 sm:px-8 dark:from-brand-950/50 dark:to-brand-900/30">
        <p className="text-xs font-semibold tracking-wide text-accent uppercase">
          Personal consultations
        </p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl">Consult your astrologer directly</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Book a time or talk now with verified Astro Kaal Chakra astrologers on their personal pages. Pay per minute from your Astro Kaal Chakra wallet. Nothing is charged if a session doesn&apos;t happen.
        </p>
        <form className="mt-5 flex flex-col gap-2 sm:flex-row" role="search">
          <input type="hidden" name="all" value="1" />
          <label className="relative flex-1">
            <span className="sr-only">Search astrologers</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input name="q" defaultValue={q} placeholder="Search by name, expertise or language" className={cn(inputClasses, "h-11 pl-9")} />
          </label>
          <select name="mode" defaultValue={mode} className={cn(inputClasses, "h-11 sm:w-44")} aria-label="Consultation type">
            <option value="">Any type</option>
            <option value="chat">Chat</option>
            <option value="audio">Voice call</option>
            <option value="video">Video call</option>
          </select>
          <label className="flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm">
            <input type="checkbox" name="online" value="1" defaultChecked={online === "1"} className="accent-brand-600" /> Online now
          </label>
          <button type="submit" className="h-11 rounded-xl bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700">
            Search
          </button>
        </form>
      </section>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-semibold">Astrologers on personal consultations</h2>
        {(q || mode || online) && (
          <Link href="/?all=1" className="text-sm text-accent hover:underline">
            Clear filters
          </Link>
        )}
      </div>

      {list.length ? (
        <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {list.map((a) => (
            <li key={a.slug}>
              <AstrologerCard a={a} />
            </li>
          ))}
        </ul>
      ) : (
        <Card className="mt-3">
          <EmptyState icon={Search} title="No astrologers match" description="Try another name or expertise, or clear the filters." />
        </Card>
      )}
      <div className="mt-8">
        <TrustNote />
      </div>
    </div>
  );
}

function TrustNote() {
  return (
    <p className="flex items-start gap-2 rounded-2xl border border-line p-4 text-sm text-muted">
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-green-600" aria-hidden />
      Only verified Astro Kaal Chakra astrologers with an active personal-consultation plan and an approved profile appear here.
    </p>
  );
}
