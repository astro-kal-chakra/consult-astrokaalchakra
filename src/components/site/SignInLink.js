"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonClasses } from "@/components/ui";

/** "Sign in" that comes back to the current page after login. */
export function SignInLink() {
  const path = usePathname();
  return (
    <Link href={`/login?as=customer&next=${encodeURIComponent(path || "/")}`} className={buttonClasses({ size: "sm" })}>
      Sign in
    </Link>
  );
}
