// In-page jumps, in one place.
//
// Anchor links used to be left to the browser and the Next router, and they
// misfired in ways that all looked like "the nav is broken": clicking the link
// for the section you are already on did nothing (the hash had not changed, so
// nothing scrolled), and a target without scroll-margin landed underneath the
// fixed nav bar. Both are handled here instead of hoped for.

export const NAV_OFFSET = 84;

/** Scrolls to an element id. Returns false when there is nothing to scroll to,
 *  so callers can fall back to normal link behavior. */
export function scrollToHash(hash: string, smooth = true): boolean {
  if (typeof window === "undefined") return false;
  const id = decodeURIComponent(hash.replace(/^#/, ""));
  if (!id) return false;
  const el = document.getElementById(id);
  if (!el) return false;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET);
  window.scrollTo({ top, behavior: smooth && !reduced ? "smooth" : "auto" });
  return true;
}

/** Click handler for a link like "/#faq". Handles it here when the target is
 *  on the page already; otherwise returns false and lets the router navigate. */
export function handleAnchorClick(
  e: React.MouseEvent<HTMLAnchorElement>,
  href: string,
  pathname: string
): boolean {
  // Modified clicks belong to the browser: new tab, new window, download.
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
    return false;
  }
  const i = href.indexOf("#");
  if (i < 0) return false;
  const path = href.slice(0, i) || "/";
  const hash = href.slice(i);
  if (path !== pathname) return false;
  if (!document.getElementById(hash.slice(1))) return false;

  e.preventDefault();
  scrollToHash(hash);
  window.history.replaceState(null, "", hash);
  return true;
}
