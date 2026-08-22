// What the bar is standing on.
//
// The home page alternates constantly: cream syllabus, midnight grades, cream
// How It Works, amber book, green enroll. A dark translucent slab dragged over
// the light ones is heavy, which is the whole complaint. So the bar does not
// carry a skin of its own. It borrows the paper of whatever section it is over
// and wears it at low alpha, which is nothing to the eye over flat ground and
// becomes legibility insurance the moment a 100px headline passes underneath.
//
// Surfaces are declared, not sampled off the painted pixels. The sections are
// known at build time, an attribute is free and exact, and reading colour back
// out of the compositor is both slower and wrong on gradients.

export type SurfaceMode = "dark" | "light" | "green";

export type Surface = {
  mode: SurfaceMode;
  /** The section's own background, ready to use as the bar's fill. */
  tint: string;
};

/** The dark sections mostly run gradients, which have no background colour of
 *  their own to borrow, so they all share one midnight. */
const DARK_TINT = "rgba(16, 17, 26, 0.5)";
const SKIN_ALPHA = 0.55;

const DEFAULT: Surface = { mode: "dark", tint: DARK_TINT };

/** "rgb(242, 238, 227)" -> "rgba(242, 238, 227, 0.55)". Returns null for
 *  anything transparent or unparseable, which means there is nothing to
 *  borrow and the caller should fall back. */
function tintFrom(color: string): string | null {
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
  if (parts.length < 3 || parts.slice(0, 3).some(Number.isNaN)) return null;
  if (parts.length > 3 && parts[3] < 0.5) return null;
  return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${SKIN_ALPHA})`;
}

/**
 * Which declared surface crosses the given viewport y.
 *
 * Rects are read live rather than cached from offsets, because How It Works is
 * pinned by ScrollTrigger and its offset lies for the whole time it is pinned.
 * Later elements win, so the marquee band, which is rotated and overlaps its
 * neighbours, correctly claims the line while it covers it.
 */
export function readSurface(y: number): Surface {
  if (typeof document === "undefined") return DEFAULT;
  const marked = document.querySelectorAll<HTMLElement>("[data-surface]");
  let hit: HTMLElement | null = null;
  for (const el of marked) {
    const r = el.getBoundingClientRect();
    if (r.height > 0 && r.top <= y && r.bottom > y) hit = el;
  }
  if (!hit) return DEFAULT;

  const declared = hit.getAttribute("data-surface");
  const mode: SurfaceMode = declared === "light" || declared === "green" ? declared : "dark";
  if (mode === "dark") return { mode, tint: DARK_TINT };

  return { mode, tint: tintFrom(getComputedStyle(hit).backgroundColor) ?? DARK_TINT };
}

/** How far down the page we are, 0 to 1. */
export function scrollProgress(): number {
  if (typeof window === "undefined") return 0;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  if (max <= 0) return 0;
  return Math.min(1, Math.max(0, window.scrollY / max));
}
