"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-fetches the server page every `ms` while the tab is visible, so new talk-now requests show up on their own. */
export function AutoRefresh({ ms = 8000 }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const t = setInterval(tick, ms);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [ms, router]);
  return null;
}
