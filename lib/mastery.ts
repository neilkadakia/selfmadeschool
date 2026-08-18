// Spaced repetition: the school stops letting you forget.
//
// The old model was a miss pile. You got a question wrong, it went in; you
// got it right twice, it left forever. That drills a mistake out of you and
// then never checks again, which is exactly how a thing you "learned" in
// March is gone by June.
//
// This schedules instead. Every question you answer joins a ladder of
// boxes, and each box is a waiting time: one day, three, a week, three
// weeks, two months, half a year. Answer it right on the day it comes due
// and it climbs a box and waits longer. Get it wrong and it drops to the
// bottom and comes back tomorrow. Nothing is ever finished, it just gets
// quieter, which is the honest version of remembering something.
//
// Leitner boxes rather than SM-2 on purpose: a student can be told the whole
// rule in one sentence, and a schedule you understand is a schedule you
// trust. There is no half-remembered confidence rating to guess at.

import { COURSES, type QuizQuestion } from "./lms";

export type MasteryEntry = {
  /** How many times this one has been missed, ever. Kept for the make-up sort. */
  miss: number;
  /** Correct answers in a row, still used to award the Comeback badge. */
  streak: number;
  /** Last day it was answered, as a local yyyy-mm-dd. */
  last: string;
  /** Leitner box, 0 to BOX_DAYS.length - 1. Absent on entries written before scheduling existed. */
  box?: number;
  /** The local day it next comes due. Absent means due now. */
  due?: string;
};

export type MasteryMap = Record<string, MasteryEntry>;

export const MASTER_STREAK = 2;
export const MAKEUP_SESSION_SIZE = 8;
export const XP_MASTERED = 5;

// The ladder. Each step is roughly triple the last, which is the shape the
// forgetting curve wants and is also easy to say out loud.
export const BOX_DAYS = [1, 3, 7, 21, 60, 180] as const;
export const TOP_BOX = BOX_DAYS.length - 1;

// What each rung is called on screen. "Learning" through "Known cold".
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

// yyyy-mm-dd in the student's own timezone. Review is a daily habit, so the
// day has to be their day, not UTC's.
export function localDay(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Entries written before scheduling existed carry no box or due date. Read
// them as what they were: a missed question still owed, or a retired one
// resting near the top of the ladder.
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

// Where an answer sends a question next. Right climbs one rung, wrong drops
// to the bottom: a thing you just got wrong is not a thing you know.
export function schedule(e: MasteryEntry | undefined, correct: boolean): MasteryEntry {
  const prev = e ?? { miss: 0, streak: 0, last: "" };
  const { box } = readEntry(prev);
  const nextBox = correct ? Math.min(box + 1, TOP_BOX) : 0;
  return {
    miss: prev.miss + (correct ? 0 : 1),
    streak: correct ? prev.streak + 1 : 0,
    last: localDay(),
    box: nextBox,
    due: localDay(BOX_DAYS[nextBox]),
  };
}

export type DueQuestion = {
  key: string;
  question: QuizQuestion;
  source: string; // unit title
  streak: number;
  miss: number;
  box: number;
  overdueDays: number;
};

function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00`);
  const b = Date.parse(`${to}T00:00:00`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86400000);
}

// Everything owed today, resolved back to live questions. Keys that no
// longer match content (a rewritten lesson) drop out silently.
export function dueQuestions(mastery: MasteryMap, today = localDay()): DueQuestion[] {
  const out: DueQuestion[] = [];
  for (const [key, entry] of Object.entries(mastery)) {
    const { box, due } = readEntry(entry);
    if (due > today) continue;
    const hash = key.lastIndexOf("#");
    const path = key.slice(0, hash);
    const index = Number(key.slice(hash + 1));
    const slash = path.indexOf("/");
    const course = COURSES.find((c) => c.slug === path.slice(0, slash));
    if (!course) continue;
    const unitSlug = path.slice(slash + 1);
    const question = course.lessons[unitSlug]?.quiz[index];
    if (!question) continue;
    const unit = course.parts.flatMap((p) => p.units).find((u) => u.slug === unitSlug);
    out.push({
      key,
      question,
      source: unit?.title ?? unitSlug,
      streak: entry.streak,
      miss: entry.miss,
      box,
      overdueDays: Math.max(0, daysBetween(due, today)),
    });
  }
  // Longest overdue first, then the shakiest, then the most-missed: the
  // ones nearest to being forgotten lead the session.
  out.sort((a, b) => b.overdueDays - a.overdueDays || a.box - b.box || b.miss - a.miss);
  return out;
}

/** What the ladder looks like right now, for the Study Hall header. */
export function reviewShape(mastery: MasteryMap, today = localDay()) {
  const boxes = BOX_DAYS.map(() => 0);
  let due = 0;
  let tomorrow = 0;
  const t = localDay(1);
  for (const entry of Object.values(mastery)) {
    const r = readEntry(entry);
    boxes[r.box]++;
    if (r.due <= today) due++;
    else if (r.due <= t) tomorrow++;
  }
  return { boxes, due, tomorrow, tracked: Object.values(mastery).length };
}

/** The next day anything is owed, for "nothing due" states. */
export function nextDueDay(mastery: MasteryMap): string | null {
  let best: string | null = null;
  for (const entry of Object.values(mastery)) {
    const { due } = readEntry(entry);
    if (best === null || due < best) best = due;
  }
  return best;
}
