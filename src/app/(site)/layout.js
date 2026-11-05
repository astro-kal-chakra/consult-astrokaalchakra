import { SiteFooter, SiteHeader } from "@/components/site/SiteHeader";

export const dynamic = "force-dynamic";

/** Customer side: personal pages, My bookings / following / wallet, session rooms. */
export default function SiteLayout({ children }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="container-page flex-1 py-6 lg:py-8">{children}</main>
      <SiteFooter />
    </div>
  );
}
