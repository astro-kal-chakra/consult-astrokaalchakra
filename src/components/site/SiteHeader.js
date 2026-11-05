import Image from "next/image";
import Link from "next/link";
import { LayoutDashboard, LogOut, Wallet } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getWallet } from "@/lib/data/customer-data";
import { rupees } from "@/lib/format";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { SignInLink } from "./SignInLink";

/** Header for customer pages (personal pages, My bookings, sessions). */
export async function SiteHeader() {
  const s = await getSession();
  const wallet = s?.role === "customer" ? await getWallet(s.id).catch(() => null) : null;
  const link = "rounded-lg px-2.5 py-1.5 text-sm text-muted hover:bg-surface-muted hover:text-fg";

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
      <div className="container-page flex flex-wrap items-center gap-2 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/images/logo-mark.png" alt="" width={32} height={32} className="size-8" />
          <span className="leading-tight">
            <span className="block font-display text-lg">Astro Kaal Chakra</span>
            <span className="block text-[10px] tracking-wide text-accent uppercase">Personal consultations</span>
          </span>
        </Link>
        <nav className="ml-auto flex flex-wrap items-center gap-1" aria-label="Account">
          {s?.role !== "astrologer" && (
            <Link href="/" className={link}>
              Astrologers
            </Link>
          )}
          {wallet && (
            <>
              <Link href="/my/wallet" className="mr-1 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                <Wallet className="size-4" aria-hidden /> {rupees(wallet.balance)}
              </Link>
              <Link href="/my/bookings" className={link}>
                My bookings
              </Link>
              <Link href="/my/following" className={`${link} hidden sm:inline`}>
                Following
              </Link>
              {/* A plain link on purpose: <Link> would prefetch /logout and sign the customer out */}
              <a href="/logout" className={link} title="Sign out">
                <LogOut className="size-4" aria-label="Sign out" />
              </a>
            </>
          )}
          {s?.role === "astrologer" && (
            <Link href="/dashboard" className={`${link} inline-flex items-center gap-1.5`}>
              <LayoutDashboard className="size-4" aria-hidden /> Dashboard
            </Link>
          )}
          {!s && <SignInLink />}
          <ThemeToggle className="ml-1" />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="container-page flex flex-wrap items-center justify-between gap-2 py-5 text-xs text-muted">
        <p>Personal consultations on Astro Kaal Chakra · Separate from your marketplace bookings</p>
        <p className="flex gap-3">
          <a href="https://www.astrokaalchakra.com" className="hover:text-fg">
            Main website
          </a>
          <a href="https://www.astrokaalchakra.com/legal/terms" className="hover:text-fg">
            Terms
          </a>
          <a href="https://www.astrokaalchakra.com/legal/privacy" className="hover:text-fg">
            Privacy
          </a>
          <a href="https://www.astrokaalchakra.com/contact" className="hover:text-fg">
            Help
          </a>
        </p>
      </div>
    </footer>
  );
}
