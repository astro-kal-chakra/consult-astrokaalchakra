"use client";

import { useEffect } from "react";

export const LAST_ASTRO_COOKIE = "kc_last_astro";

/**
 * Remembers the personal page a visitor opened (30 days), so the consult home can feature that astrologer
 * first and show the rest as "similar". Not sensitive: just the public page slug.
 */
export function RememberAstrologer({ slug }) {
  useEffect(() => {
    document.cookie = `${LAST_ASTRO_COOKIE}=${encodeURIComponent(slug)}; path=/; max-age=${30 * 24 * 3600}; samesite=lax`;
  }, [slug]);
  return null;
}
