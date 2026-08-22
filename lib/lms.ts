// Self Made School LMS: multi-course model.
// Courses wrap parts of units; live units carry a full Lesson
// (written lesson, knowledge check, flashcards, real-life action).

import { PARTS, type Part, type Unit } from "./curriculum";
import { LESSONS_13 } from "./lessons13";
import { COURSE_14 } from "./course14";
import { COURSE_15 } from "./course15";

// A lesson is a list of blocks. The media kinds carry URLs rather than the
// bytes: this is a static export, so a file lives in public/ or on a host,
// and nothing here ever embeds base64 into the bundle.
export type LessonBlock =
  | { kind: "p"; text: string }
  | { kind: "h"; text: string }
  | { kind: "callout"; title: string; text: string }
  | { kind: "bigfact"; stat: string; caption: string }
  | { kind: "list"; title?: string; items: string[] }
  | { kind: "example"; title: string; text: string }
  | { kind: "quote"; text: string; who?: string }
  | { kind: "image"; src: string; alt: string; caption?: string }
  // A filmed piece we host ourselves. Never call it a module.
  | { kind: "video"; src: string; poster?: string; caption?: string }
  // A filmed piece on YouTube or Vimeo, in the same 16:9 frame.
  | { kind: "embed"; src: string; title: string; caption?: string }
  | { kind: "audio"; src: string; title: string; caption?: string }
  | { kind: "file"; href: string; name: string; note?: string }
  // The graphic kinds. They exist so a lesson is not a wall of text, and they
  // carry structure, never bytes: a lesson stays a plain object the API and
  // the phone app can both read. All but `art` are generic, so any unit fills
  // one with its own numbers rather than asking for a bespoke drawing.
  | {
      kind: "split";
      title?: string;
      leftLabel: string;
      rightLabel: string;
      rows: { left: string; right: string }[];
    }
  | { kind: "steps"; title?: string; steps: { label: string; text: string }[] }
  // Quantities next to each other. Bars are drawn as a share of the largest
  // value, so the numbers stay the author's and the scale draws itself.
  | {
      kind: "bars";
      title?: string;
      items: { label: string; value: number; display?: string; note?: string; tone?: Tone }[];
      caption?: string;
    }
  // A sequence, or a cycle when `loop` is set and it returns to the first box.
  | {
      kind: "flow";
      title?: string;
      loop?: boolean;
      tone?: Tone;
      steps: { label: string; note?: string }[];
      caption?: string;
    }
  // Something changing along time. `at` is the label under the point.
  | {
      kind: "timeline";
      title?: string;
      points: { at: string; label: string; note?: string; tone?: Tone }[];
      caption?: string;
    }
  // A calculation worked in the open, ending in one number. The money
  // workhorse: a paycheck, an offer, a month of rent.
  | {
      kind: "receipt";
      title?: string;
      lines: { label: string; value: string; note?: string; tone?: Tone }[];
      total?: { label: string; value: string };
      caption?: string;
    }
  // A spectrum with the poles named and marks placed along it. `at` is a
  // percentage from the left end.
  | {
      kind: "scale";
      title?: string;
      left: string;
      right: string;
      marks: { at: number; label: string; tone?: Tone }[];
      caption?: string;
    }
  // Three or four things compared on the same rows. Two things belong in a
  // `split`, which pairs them properly on a phone.
  | {
      kind: "table";
      title?: string;
      head: string[];
      rows: string[][];
      caption?: string;
    }
  | { kind: "art"; art: LessonArt; alt: string; caption?: string }
  | { kind: "divider" };

// Tone on a graphic is meaning, not decoration: good is the move to make,
// warn is the trap, and plain is neither.
export type Tone = "good" | "warn" | "plain";

// The diagrams the site knows how to draw. A lesson picks one by name; the
// picture lives in components/lms/LessonArt.tsx. Named rather than free-form
// because a lesson author should not be writing SVG, and because every
// drawing has to survive the phone and a screen reader.
export type LessonArt =
  | "two-voices"
  | "critic-cost"
  | "start-cost"
  | "shrink-it"
  | "never-miss-twice"
  | "the-long-middle";

export type QuizQuestion = {
  q: string;
  options: string[];
  answer: number;
  explain: string;
};

export type Flashcard = { front: string; back: string };

export type Lesson = {
  hook: string;
  blocks: LessonBlock[];
  /* Key Takeaways and The Lesson, carried over from the book: the chapter
     distilled to bullets, then to a single line. Optional while the chapters
     are being brought across one unit at a time; a unit without them renders
     exactly as it did before. */
  takeaways?: string[];
  theLesson?: string;
  quiz: QuizQuestion[];
  cards: Flashcard[];
  action: string;
};

export type Course = {
  slug: string;
  title: string;
  kicker: string;
  tone: "acc" | "vio" | "coral";
  status: "live" | "preview";
  headline: string;
  description: string;
  parts: Part[];
  lessons: Record<string, Lesson>;
};

export type { Part, Unit };

export const COURSES: Course[] = [
  {
    slug: "the-13th-grade",
    title: "The 13th Grade",
    kicker: "Course One",
    tone: "acc",
    status: "live",
    headline: "The intro course. Everything school skipped.",
    description:
      "Working on your mindset, your money, and dealing with life's big calls. 24 bite-size units, each paired with a chapter of the book.",
    parts: PARTS,
    lessons: LESSONS_13,
  },
  COURSE_14,
  COURSE_15,
];

export function getCourse(slug: string): Course | undefined {
  return COURSES.find((c) => c.slug === slug);
}

export type FlatUnit = Unit & { part: Part; course: Course; number: number };

export function courseUnits(course: Course): FlatUnit[] {
  let n = 0;
  return course.parts.flatMap((part) =>
    part.units.map((u) => ({ ...u, part, course, number: ++n }))
  );
}

export function getCourseUnit(courseSlug: string, unitSlug: string): FlatUnit | undefined {
  const course = getCourse(courseSlug);
  if (!course) return undefined;
  return courseUnits(course).find((u) => u.slug === unitSlug);
}

export function getLesson(course: Course, unitSlug: string): Lesson | undefined {
  return course.lessons[unitSlug];
}

// Old /learn/<unit>/ URLs (v1 had 13th Grade units at the top level).
// Also maps the retired failure-reps slug to its renamed unit.
export const LEGACY_UNIT_REDIRECTS: Record<string, string> = Object.fromEntries([
  ...PARTS.flatMap((p) => p.units.map((u) => [u.slug, `/learn/the-13th-grade/${u.slug}/`])),
  ["failure-reps", "/learn/the-13th-grade/rejection-practice/"],
]);

// ---------- Gamification ----------

export const XP = {
  unit: 100,
  quizPerfect: 50,
  deck: 25,
} as const;

export const LEVELS = [
  { at: 0, name: "Freshman" },
  { at: 300, name: "Sophomore" },
  { at: 700, name: "Junior" },
  { at: 1200, name: "Senior" },
  { at: 2000, name: "Valedictorian" },
  { at: 3000, name: "Self Made" },
] as const;

export function levelFor(xp: number) {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].at) index = i;
  const current = LEVELS[index];
  const next = LEVELS[index + 1];
  const pct = next ? Math.min(100, Math.round(((xp - current.at) / (next.at - current.at)) * 100)) : 100;
  return { index, name: current.name, next: next?.name, nextAt: next?.at, pct };
}

export type Badge = {
  id: string;
  name: string;
  blurb: string;
  icon: string; // small inline label, not an emoji font gamble
};

export const BADGES: Badge[] = [
  { id: "first-unit", name: "First Day", blurb: "Complete your first unit.", icon: "01" },
  { id: "five-units", name: "Showing Up", blurb: "Complete five units.", icon: "05" },
  { id: "part-done", name: "Section Closed", blurb: "Finish every unit in a part.", icon: "▣" },
  { id: "quiz-perfect", name: "Straight A", blurb: "Get every question right on a knowledge check.", icon: "A+" },
  { id: "deck-done", name: "Card Counter", blurb: "Finish a flashcard deck.", icon: "▤" },
  { id: "note-taker", name: "Margin Notes", blurb: "Save your first note.", icon: "✎" },
  { id: "streak-3", name: "Three in a Row", blurb: "Learn three days in a row.", icon: "3d" },
  { id: "streak-7", name: "Full Week", blurb: "Learn seven days in a row.", icon: "7d" },
  { id: "well-rounded", name: "Well Rounded", blurb: "Complete a unit in all three courses.", icon: "◎" },
  { id: "course-done", name: "Graduate", blurb: "Finish an entire course.", icon: "★" },
  { id: "study-hall", name: "Study Hall", blurb: "Finish a review session.", icon: "▥" },
  { id: "honors", name: "With Honors", blurb: "Pass a course final with 10 of 12 or better.", icon: "H" },
  { id: "suited-up", name: "Suited Up", blurb: "Buy your first piece of gear from the Locker.", icon: "◈" },
  { id: "slayer", name: "Monster Slayer", blurb: "Win your first boss battle in the Arena.", icon: "⚔" },
  { id: "comeback", name: "The Comeback", blurb: "Master a question you once missed.", icon: "↺" },
  { id: "hands-dirty", name: "Hands Dirty", blurb: "File your first Field Work report.", icon: "⚒" },
  { id: "field-tested", name: "Field Tested", blurb: "File ten Field Work reports.", icon: "10" },
];

export const XP_EXTRA = {
  review: 25, // once per day
  final: 200, // first pass per course
  fieldwork: 50, // per unit, first filing only. The real world pays best
} as const;

export const FINAL_QUESTIONS = 12;
export const FINAL_PASS = 10;

export function badgeById(id: string): Badge | undefined {
  return BADGES.find((b) => b.id === id);
}
