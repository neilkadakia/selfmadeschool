// The pace you set for yourself.
//
// Teachable and Kajabi solve pacing with drip: the person who made the course
// decides when you may see the next part. That is the right tool for a cohort
// and the wrong one for a school whose whole pitch is a year you can take on
// your own. So the student sets the number, and the school just keeps count
// and tells the truth about it.
//
// It can only count completions it has a date for. Units finished before the
// completion log existed carry no date, and are left out rather than guessed
// at, which is why a long-standing student may see a small first week.

import { COURSES, courseUnits, type Course } from "./lms";

export const PACE_CHOICES = [1, 2, 3, 5, 7] as const;

/** Monday of the week containing `day`, as yyyy-mm-dd. */
export function weekStart(day: string): string {
  const d = new Date(`${day}T00:00:00`);
  if (Number.isNaN(d.getTime())) return day;
  // getDay is 0 for Sunday, so Sunday belongs to the week that just ended.
  const back = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - back);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00`);
  d.setDate(d.getDate() + n);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export type PaceRead = {
  target: number;
  /** Units finished since Monday, counting only ones with a recorded date. */
  thisWeek: number;
  onPace: boolean;
  /** The course they are currently working through. */
  course: Course;
  remaining: number;
  /** When the current course lands at this pace, or null if there is nothing left. */
  finishBy: string | null;
  /** True when some completions predate the log, so the count understates. */
  partial: boolean;
};

export function readPace(
  pace: number,
  done: Record<string, string[]>,
  doneAt: Record<string, string>,
  today: string
): PaceRead | null {
  if (!pace) return null;

  const monday = weekStart(today);
  let thisWeek = 0;
  for (const day of Object.values(doneAt)) {
    if (day >= monday && day <= today) thisWeek++;
  }

  // The course being worked through: the first with anything left in it.
  const course =
    COURSES.find((c) => {
      const list = done[c.slug] ?? [];
      return courseUnits(c).some((u) => !list.includes(u.slug));
    }) ?? COURSES[0];

  const list = done[course.slug] ?? [];
  const units = courseUnits(course);
  const remaining = units.filter((u) => !list.includes(u.slug)).length;

  const totalDone = Object.values(done).reduce((a, b) => a + b.length, 0);
  const partial = totalDone > Object.keys(doneAt).length;

  return {
    target: pace,
    thisWeek,
    onPace: thisWeek >= pace,
    course,
    remaining,
    finishBy: remaining > 0 ? addDays(today, Math.ceil(remaining / pace) * 7) : null,
    partial,
  };
}
