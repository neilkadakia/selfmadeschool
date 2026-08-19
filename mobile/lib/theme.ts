// The school's colours, on a phone.
//
// Same tokens as app/globals.css in the web repo. The classroom is dark and
// stays dark: there is no light mode here, because the ink ground is the
// brand, not a preference.

export const C = {
  ink: "#0E0E12",
  paper: "#F2EEE3",
  acc: "#43DE7B",
  vio: "#5B7CFA",
  coral: "#FFB43A",
  lime: "#B8C94F",
  pink: "#FF9DE2",
  /** Midnight: ink with about a fifth of cobalt in it. */
  deep: "#1B2247",

  /** Text on the ink ground, quietened. */
  muted: "rgba(242, 238, 227, 0.75)",
  faint: "rgba(242, 238, 227, 0.55)",
  ghost: "rgba(242, 238, 227, 0.34)",

  /** Surfaces that sit above the ground. */
  card: "rgba(242, 238, 227, 0.05)",
  cardHi: "rgba(242, 238, 227, 0.09)",
  line: "rgba(242, 238, 227, 0.12)",
  lineHi: "rgba(242, 238, 227, 0.2)",

  danger: "#FF6B6B",
} as const;

/** Course tones, matching the web. */
export const TONE: Record<string, string> = {
  acc: C.acc,
  vio: C.vio,
  coral: C.coral,
};

export function toneOf(tone: string | undefined): string {
  return TONE[tone ?? "acc"] ?? C.acc;
}

// Bricolage Grotesque for display, Instrument Sans for body: the same pairing
// as the site. Loaded in app/_layout.tsx; these are the family names to use.
export const F = {
  display: "Bricolage_800ExtraBold",
  displayMid: "Bricolage_700Bold",
  body: "Instrument_400Regular",
  bodyMid: "Instrument_500Medium",
  bodyBold: "Instrument_600SemiBold",
} as const;

/** One spacing scale, so screens do not each invent their own. */
export const S = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 40,
} as const;

export const R = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  pill: 999,
} as const;
