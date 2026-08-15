// The 13th Grade: 24 units in three parts of eight.
// Each unit pairs a book chapter with a bite-size online lesson.

export type Unit = {
  slug: string;
  title: string;
  blurb: string;
  live: boolean; // video recorded and available (vs. chapter-first)
};

export type Part = {
  id: string;
  name: string;
  tone: "acc" | "vio" | "coral";
  tagline: string;
  action: string;
  units: Unit[];
};

export const PARTS: Part[] = [
  {
    id: "mindset",
    name: "Growing Your Mindset",
    tone: "acc",
    tagline: "The operating system everything else runs on.",
    action: "Try one small thing from this chapter today. Small counts.",
    units: [
      { slug: "mindset-hacks", title: "Mindset Hacks", blurb: "Habits, discipline, and talking to yourself like a coach instead of a critic.", live: true },
      { slug: "comparison-trap", title: "The Comparison Trap", blurb: "Instagram is not a benchmark. Building your own scoreboard.", live: false },
      { slug: "first-principles", title: "First Principles Thinking", blurb: "Strip a problem down to what's actually true, then rebuild from there.", live: false },
      { slug: "habit-loops", title: "Habit Loops", blurb: "Cue, routine, reward: wiring the boring stuff to run on autopilot.", live: false },
      { slug: "emotional-intelligence", title: "Emotional Intelligence 101", blurb: "Reading the room, naming the feeling, responding instead of reacting.", live: false },
      { slug: "boundaries", title: "Boundaries", blurb: "Saying no without burning bridges: at work, at home, in the group chat.", live: false },
      { slug: "rejection-practice", title: "Rejection Practice", blurb: "Getting told no on purpose until it stops being scary.", live: false },
      { slug: "purpose-roughly", title: "Purpose, Roughly", blurb: "You don't need a calling. You need a direction and a next step.", live: false },
    ],
  },
  {
    id: "money",
    name: "Mastering Money",
    tone: "vio",
    tagline: "Every dollar, decoded in plain English.",
    action: "Open the account, file the form, or run your real numbers. One action, today.",
    units: [
      { slug: "money-101", title: "Money 101", blurb: "Budgeting that doesn't feel like punishment. Where your paycheck actually goes.", live: true },
      { slug: "tax-season", title: "Tax Season, Decoded", blurb: "W-2? 1099? Refund? Plain English, before April ruins your month.", live: true },
      { slug: "credit-glow-up", title: "Credit Glow-Up", blurb: "From \"no score\" to \"approved\" without falling for a single trap.", live: true },
      { slug: "invest-eventually", title: "Invest, Eventually", blurb: "401(k)s and index funds for people with fifty bucks and a dream.", live: true },
      { slug: "paychecks-benefits", title: "Paychecks & Benefits", blurb: "The 401(k) match, the HSA, the insurance elections: the form nobody explains.", live: false },
      { slug: "debt-strategically", title: "Debt, Strategically", blurb: "Student loans, car notes, and the order to pay them down in.", live: false },
      { slug: "emergency-funds", title: "Emergency Funds", blurb: "Why three months of rent in a boring account beats any hot tip.", live: false },
      { slug: "negotiation", title: "Negotiation", blurb: "Asking for more (salary, rent, bills) without your voice shaking.", live: false },
    ],
  },
  {
    id: "big-calls",
    name: "Life's Big Calls",
    tone: "coral",
    tagline: "A framework for the decisions that shape your decade.",
    action: "Write one real decision down and run it through the chapter's framework.",
    units: [
      { slug: "the-big-calls", title: "The Big Calls", blurb: "Career moves, new cities, big relationships: how to actually think them through.", live: true },
      { slug: "first-apartments", title: "First Apartments", blurb: "Leases, deposits, roommates: what to read before you sign.", live: false },
      { slug: "career-moves", title: "Career Moves", blurb: "When to stay, when to jump, and how to tell the difference.", live: false },
      { slug: "new-cities", title: "New Cities", blurb: "Moving somewhere you know nobody: the checklist and the math.", live: false },
      { slug: "big-relationships", title: "Big Relationships", blurb: "Money talks, moving in, and the conversations that decide everything.", live: false },
      { slug: "health-insurance", title: "Health & Insurance", blurb: "Deductibles, premiums, networks: decoded before you need them.", live: false },
      { slug: "family-money-talks", title: "Family Money Talks", blurb: "Helping parents, taking help, and keeping all of it healthy.", live: false },
      { slug: "ten-year-view", title: "The Ten-Year View", blurb: "Zooming out: decisions that compound, and the ones that don't matter.", live: false },
    ],
  },
];

export const ALL_UNITS: (Unit & { part: Part; index: number })[] = PARTS.flatMap((part) =>
  part.units.map((u, i) => ({ ...u, part, index: i }))
);

export function unitNumber(slug: string): number {
  return ALL_UNITS.findIndex((u) => u.slug === slug) + 1;
}

export function getUnit(slug: string) {
  return ALL_UNITS.find((u) => u.slug === slug);
}
