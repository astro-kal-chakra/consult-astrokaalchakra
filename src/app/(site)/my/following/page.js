import Link from "next/link";
import { Heart } from "lucide-react";
import { requireCustomer } from "@/lib/auth/guard";
import { listFollowing } from "@/lib/data/customer-data";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: "Following" };
export const dynamic = "force-dynamic";

const DOT = { online: "bg-online", busy: "bg-busy", offline: "bg-offline" };

export default async function FollowingPage() {
  const { id } = await requireCustomer("/my/following");
  const list = await listFollowing(id);

  return (
    <>
      <PageHeader title="Following" description="Personal pages you follow. These are separate from the astrologers you follow on the Astro Kaal Chakra app." />
      <Card>
        {list.length ? (
          <ul className="divide-y divide-line">
            {list.map((a) => {
              const presence = a.available ? a.presence : "offline";
              return (
                <li key={a.slug}>
                  <Link href={`/${a.slug}`} className="flex items-center gap-3 px-5 py-4 hover:bg-surface-muted">
                    {a.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- astrologer photo from our own storage
                      <img src={a.photoUrl} alt="" className="size-11 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 dark:bg-brand-900/50 dark:text-brand-200">
                        {a.name
                          .split(" ")
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{a.name}</p>
                      {a.headline && <p className="truncate text-sm text-muted">{a.headline}</p>}
                      <p className="text-xs text-muted">Following since {formatDate(a.followedAt)}</p>
                    </div>
                    {a.available ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium capitalize">
                        <span className={cn("size-2 rounded-full", DOT[presence])} aria-hidden /> {presence}
                      </span>
                    ) : (
                      <Badge>Not available</Badge>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={Heart} title="You're not following anyone yet" description="Follow an astrologer from their personal page to see them here." />
        )}
      </Card>
    </>
  );
}
