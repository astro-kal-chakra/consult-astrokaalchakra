import Image from "next/image";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getAccount } from "@/lib/data/astro";
import { Card } from "@/components/ui";

export const metadata = { title: "Account not verified" };

export default async function NotVerifiedPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.role === "customer") redirect("/my/bookings");
  if ((await getAccount(s.id))?.verified) redirect("/dashboard");
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <Card className="max-w-md p-8 text-center">
        <Image src="/images/logo-mark.png" alt="" width={56} height={56} className="mx-auto size-14" />
        <ShieldAlert className="mx-auto mt-4 size-8 text-amber-600" aria-hidden />
        <h1 className="mt-3 text-xl font-semibold">Your astrologer account isn&apos;t verified yet</h1>
        <p className="mt-2 text-sm text-muted">
          The personal consultation dashboard opens once Astro Kaal Chakra has approved your astrologer account (KYC and training) in the KaalChakra Astro app.
        </p>
        <a href="/logout" className="mt-6 inline-block text-sm font-medium text-accent hover:underline">
          Sign out
        </a>
      </Card>
    </main>
  );
}
