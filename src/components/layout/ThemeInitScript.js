"use client";

// Applies the saved theme before the first paint (no light flash in dark mode). Same key as ThemeToggle.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('kc-consult-theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

/**
 * Runs only from the server HTML. When React renders it in the browser (e.g. after an error or not-found
 * re-render) it is an inert `text/plain` block, so React doesn't warn about a script that would never run.
 * The theme is already applied by then. (Same approach as the website.)
 */
export function ThemeInitScript() {
  return (
    <script
      id="theme-init"
      suppressHydrationWarning
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
    />
  );
}
