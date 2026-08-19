// Study Hall's schedule: Leitner boxes, same ladder as the classroom.
//
// This mirrors lib/mastery.ts in the web repo. It is a second copy on purpose:
// the web version imports the whole curriculum to build its queue, and the app
// must not ship 180 KB of lesson text it already fetches from the API. So the
// ladder maths lives here on its own, taking questions as arguments, and the
// numbers below are the contract between the two. If BOX_DAYS changes on the
// web, it changes here, or a student's schedule shifts when they switch device.

export type MasteryEntry = {
  /** How many times this one has been missed, ever. */
  miss: number;
  /** Correct answers in a row. */
  streak: number;
  /** Last day it was answered, as a local yyyy-mm-dd. */
  last: string;
  /** Leitner box, 0 to TOP_BOX. Absent on entries written before scheduling existed. */
  box?: number;
  /** The local day it next comes due. Absent means due now. */
  due?: string;
};

export type MasteryMap = Record<string, MasteryEntry>;

export const MASTER_STREAK = 2;
export const XP_MASTERED = 5;

// Each step is roughly triple the last: the shape the forgetting curve wants,
// and a rule a student can be told in one sentence.
export const BOX_DAYS = [1, 3, 7, 21, 60, 180] as const;
export const TOP_BOX = BOX_DAYS.length - 1;

export const BOX_LABEL = [
  "Learning",
  "Shaky",
  "Getting there",
  "Solid",
  "Strong",
  "Known cold",
] as const;

export function questionKey(courseSlug: string, unitSlug: string, index: number): string {
  return `${courseSlug}/${unitSlug}#${index}`;
}

/** Local calendar day, yyyy-mm-dd. Local, not UTC: "today" means the student's today. */
export function localDay(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + n);
  const p = (v: number) => String(v).padStart(2, "0");
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

/**
 * Entries written before scheduling existed carry no box or due date. Read
 * them as what they were: a missed question still owed, or a retired one
 * resting near the top of the ladder. Never assume box/due exist.
 */
export function readEntry(e: MasteryEntry): { box: number; due: string } {
  if (typeof e.box === "number" && e.due) return { box: e.box, due: e.due };
  const retired = e.miss > 0 && e.streak >= MASTER_STREAK;
  const box = retired ? 3 : 0;
  return { box, due: e.last || localDay() };
}

/** Due today or overdue. */
export function isDue(e: MasteryEntry | undefined, today = localDay()): boolean {
  if (!e) return false;
  return readEntry(e).due <= today;
}

/**
 * Where an answer sends a question next. Right climbs one rung, wrong drops
 * to the bottom: a thing you just got wrong is not a thing you know. Nothing
 * ever retires, it only gets quieter, so a unit finished in March is still
 * checked in June.
 */
export function schedule(e: MasteryEntry | undefined, correct: boolean): MasteryEntry {
  const prev = e ?? { miss: 0, streak: 0, last: "" };
  const { box } = readEntry(prev);
  const nextBox = correct ? Math.min(box + 1, TOP_BOX) : 0;
  const today = localDay();
  return {
    miss: prev.miss + (correct ? 0 : 1),
    streak: correct ? prev.streak + 1 : 0,
    last: today,
    box: nextBox,
    due: addDays(today, BOX_DAYS[nextBox]),
  };
}

export type DueQuestion = {
  key: string;
  course: string;
  unit: string;
  index: number;
  box: number;
};

/**
 * What is owed today, hardest first. Takes the keys the student has actually
 * seen; the caller supplies the questions themselves from the content cache.
 */
export function dueKeys(mastery: MasteryMap, today = localDay()): DueQuestion[] {
  const rows: DueQuestion[] = [];
  for (const [key, entry] of Object.entries(mastery)) {
    if (!isDue(entry, today)) continue;
    const [path, idx] = key.split("#");
    const [course, unit] = (path ?? "").split("/");
    if (!course || !unit) continue;
    rows.push({
      key,
      course,
      unit,
      index: Number(idx ?? 0),
      box: readEntry(entry).box,
    });
  }
  // Lowest box first: the shakiest thing you know is the thing worth an
  // early minute.
  return rows.sort((a, b) => a.box - b.box);
}

/** How the ladder is filled, for the bars in Study Hall. */
export function ladder(mastery: MasteryMap): number[] {
  const counts = BOX_DAYS.map(() => 0);
  for (const e of Object.values(mastery)) counts[readEntry(e).box] += 1;
  return counts;
}

/** The next day anything comes due, or "" when the shelf is empty. */
export function nextDueDay(mastery: MasteryMap): string {
  let best = "";
  for (const e of Object.values(mastery)) {
    const { due } = readEntry(e);
    if (!best || due < best) best = due;
  }
  return best;
}
