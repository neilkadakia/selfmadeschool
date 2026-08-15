// Learning logic: every quiz question you miss (in a unit check or an
// Arena fight) lands in the make-up pile. It leaves only after you
// answer it right MASTER_STREAK times in a row (across visits). Study
// Hall drills the pile before the flashcards.

import { COURSES, type QuizQuestion } from "./lms";

export type MasteryEntry = { miss: number; streak: number; last: string };
export type MasteryMap = Record<string, MasteryEntry>;

export const MASTER_STREAK = 2;
export const MAKEUP_SESSION_SIZE = 8;
export const XP_MASTERED = 5;

export function questionKey(courseSlug: string, unitSlug: string, index: number): string {
  return `${courseSlug}/${unitSlug}#${index}`;
}

export function isDue(e: MasteryEntry | undefined): boolean {
  return Boolean(e && e.miss > 0 && e.streak < MASTER_STREAK);
}

export type DueQuestion = {
  key: string;
  question: QuizQuestion;
  source: string; // unit title
  streak: number; // correct answers so far toward retirement
  miss: number;
};

// Resolve due keys back to live questions; keys that no longer match
// content (a rewritten lesson) drop out silently.
export function dueQuestions(mastery: MasteryMap): DueQuestion[] {
  const out: DueQuestion[] = [];
  for (const [key, entry] of Object.entries(mastery)) {
    if (!isDue(entry)) continue;
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
    out.push({ key, question, source: unit?.title ?? unitSlug, streak: entry.streak, miss: entry.miss });
  }
  // Most-missed first: the ones that need the work lead the session.
  out.sort((a, b) => b.miss - a.miss || a.streak - b.streak);
  return out;
}
