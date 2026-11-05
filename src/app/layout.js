import { Marcellus, Poppins } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeInitScript } from "@/components/layout/ThemeInitScript";
import "./globals.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins", display: "swap" });
const marcellus = Marcellus({ subsets: ["latin"], weight: "400", variable: "--font-marcellus", display: "swap" });

export const metadata = {
  title: { default: "Astro Kaal Chakra Consult", template: "%s · Astro Kaal Chakra Consult" },
  description: "Personal consultation dashboard for Astro Kaal Chakra astrologers.",
  robots: { index: false, follow: false }, // the dashboard is private; public astrologer pages will opt in
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0804" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${poppins.variable} ${marcellus.variable}`}>
      <head>
        <ThemeInitScript />
      </head>
      <body className="min-h-dvh bg-bg font-sans text-fg antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
