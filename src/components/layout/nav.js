import { BadgeIndianRupee, CalendarClock, CalendarDays, CreditCard, LayoutDashboard, LifeBuoy, MessageSquareQuote, Orbit, Settings, UserRound, Users, Video, Wallet } from "lucide-react";

/** Dashboard menu. `needs`: what must be true to use the page fully (it still opens, with a notice). */
export const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/subscription", label: "Subscription", icon: CreditCard },
  { href: "/dashboard/profile", label: "Personal profile", icon: UserRound },
  { href: "/dashboard/services", label: "Services & fees", icon: BadgeIndianRupee },
  { href: "/dashboard/availability", label: "Availability", icon: CalendarClock },
  { href: "/dashboard/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/dashboard/consultations", label: "Consultations", icon: Video },
  { href: "/dashboard/followers", label: "Followers", icon: Users },
  { href: "/dashboard/feedback", label: "Feedback", icon: MessageSquareQuote },
  { href: "/dashboard/earnings", label: "Earnings & payouts", icon: Wallet },
  { href: "/dashboard/kundali", label: "Kundali", icon: Orbit },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/support", label: "Help & support", icon: LifeBuoy },
];
