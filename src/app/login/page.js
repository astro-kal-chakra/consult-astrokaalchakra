import Image from "next/image";
import { redirect } from "next/navigation";
import { FlaskConical, ShieldCheck } from "lucide-react";
import { getSession, devLoginEnabled } from "@/lib/auth/session";
import { DEMO_ACCOUNTS, DEMO_CUSTOMERS, DEMO_OTP } from "@/lib/data/demo-accounts";
import { Card } from "@/components/ui";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LoginForm } from "./LoginForm";
import { FirebaseLogin } from "./FirebaseLogin";
import { loginConfig } from "./actions";

/** Same-site paths only ("/my/bookings"), never another site ("//x", "/\x"). */
const sameSite = (n) => n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\");
const firebaseWebConfigured = () => Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.NEXT_PUBLIC_FIREBASE_APP_ID);

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }) {
  const sp = await searchParams;
  const as = sp.as === "customer" ? "customer" : "astrologer";
  const next = typeof sp.next === "string" ? sp.next : "";
  const s = await getSession();
  if (s) redirect(s.role === "customer" ? (sameSite(next) && !next.startsWith("/dashboard") ? next : "/") : "/dashboard");
  const dev = devLoginEnabled();
  // The same OTP as the main website and the apps: Firebase when the backend uses it, otherwise the backend OTP
  const cfg = await loginConfig();
  const firebase = cfg.firebase && firebaseWebConfigured();

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-brand-50 to-bg px-4 py-10 dark:from-brand-950/40">
      <ThemeToggle className="absolute top-4 right-4" />
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image src="/images/logo-mark.png" alt="" width={64} height={64} className="size-16" priority />
          <h1 className="mt-3 font-display text-3xl">{as === "customer" ? "Sign in" : "Consult Dashboard"}</h1>
          <p className="mt-1 text-sm text-muted">{as === "customer" ? "Use your Astro Kaal Chakra account to book and consult" : "Your personal consultation business on Astro Kaal Chakra"}</p>
        </div>

        <Card className="p-6">
          {firebase ? <FirebaseLogin as={as} next={next} testing={!cfg.firebaseProd} /> : <LoginForm as={as} next={next} />}
          <p className="mt-5 flex items-start gap-2 text-xs text-muted">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-green-600" aria-hidden />
            {as === "customer"
              ? "Same account and wallet as the Astro Kaal Chakra app. We never ask for your OTP outside this screen."
              : "Only verified Astro Kaal Chakra astrologers can sign in. Your marketplace profile, prices and earnings are not changed by anything you do here."}
          </p>
          <p className="mt-3 text-center text-xs text-muted">
            {as === "customer" ? (
              <a href="/login" className="text-accent hover:underline">Are you an astrologer? Sign in to your dashboard</a>
            ) : (
              <a href="/login?as=customer" className="text-accent hover:underline">Customer? Sign in here</a>
            )}
          </p>
        </Card>

        {dev && (
          <Card className="mt-4 border-dashed p-5">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <FlaskConical className="size-4 text-brand-600" aria-hidden /> Dev mode: demo logins
            </p>
            <p className="mt-1 text-xs text-muted">
              OTP for every number: <span className="font-mono font-semibold text-fg">{DEMO_OTP}</span>. Turned off in production.
            </p>
            <p className="mt-3 text-xs font-semibold tracking-wide text-muted uppercase">Astrologers</p>
            <ul className="mt-2 space-y-2 text-sm">
              {DEMO_ACCOUNTS.map((a) => (
                <li key={a.phone} className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-mono font-medium">{a.phone}</span>
                  <span className="text-xs text-muted">{a.label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs font-semibold tracking-wide text-muted uppercase">Customers</p>
            <ul className="mt-2 space-y-2 text-sm">
              {DEMO_CUSTOMERS.map((c) => (
                <li key={c.phone} className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-mono font-medium">{c.phone}</span>
                  <span className="text-xs text-muted">{c.label}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </main>
  );
}
