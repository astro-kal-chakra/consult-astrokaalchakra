import { Users } from "lucide-react";
import { requireAstrologer } from "@/lib/auth/guard";
import { listFollowers } from "@/lib/data/astro";
import { Card, PageHeader, StatCard } from "@/components/ui";
import { FollowerList } from "./FollowerList";

export const metadata = { title: "Followers" };

const WEEK = 7 * 86400000;
const newThisWeek = (list) => {
  const since = Date.now() - WEEK;
  return list.filter((f) => new Date(f.followedAt).getTime() > since).length;
};

export default async function FollowersPage() {
  const { id } = await requireAstrologer();
  const followers = await listFollowers(id);
  const week = newThisWeek(followers);

  return (
    <>
      <PageHeader title="Followers" description="Only people who follow your personal page. Your marketplace followers are separate." />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:max-w-md">
        <StatCard icon={Users} label="Personal followers" value={followers.length} />
        <StatCard icon={Users} label="New this week" value={week} />
      </div>
      <Card>
        <FollowerList followers={followers} />
      </Card>
    </>
  );
}
