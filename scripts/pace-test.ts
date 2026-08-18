// Week boundaries and honest counting. Both are easy to get subtly wrong:
// a Sunday that belongs to next week, or a count that quietly includes
// completions that never had a date.
import { weekStart, readPace, PACE_CHOICES } from "../lib/pace";

let pass = 0;
let fail = 0;
const check = (label: string, cond: boolean) => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
};

// 2026-08-17 is a Monday; 2026-08-16 the Sunday before it.
check("Monday is its own week start", weekStart("2026-08-17") === "2026-08-17");
check("Wednesday belongs to that Monday", weekStart("2026-08-19") === "2026-08-17");
check("Sunday belongs to the week that just ended", weekStart("2026-08-23") === "2026-08-17");
check("the next Monday starts a new week", weekStart("2026-08-24") === "2026-08-24");

const done = { "the-13th-grade": ["mindset-hacks", "comparison-trap", "first-principles"] };
const doneAt = {
  "the-13th-grade/mindset-hacks": "2026-08-17",
  "the-13th-grade/comparison-trap": "2026-08-19",
  // The third was finished before the log existed, so it has no date.
};

const r = readPace(3, done, doneAt, "2026-08-20");
check("reads a pace", r !== null);
check("counts only this week's dated completions", r?.thisWeek === 2);
check("knows it is short of the target", r?.onPace === false);
check("says the count is partial when older units have no date", r?.partial === true);
check("counts what is left in the current course", r?.remaining === 21);
// 21 units left at 3 a week is 7 weeks: 49 days on from 08-20.
check("projects a finish date at that pace", r?.finishBy === "2026-10-08");

const hit = readPace(2, done, doneAt, "2026-08-20");
check("on pace once the number is met", hit?.onPace === true);

// Last week's work does not count toward this week.
const stale = readPace(3, done, { "the-13th-grade/mindset-hacks": "2026-08-10" }, "2026-08-20");
check("last week's completions do not count", stale?.thisWeek === 0);

// A future-dated entry (clock skew across devices) must not count either.
const future = readPace(3, done, { "the-13th-grade/mindset-hacks": "2026-08-30" }, "2026-08-20");
check("a future-dated completion does not count", future?.thisWeek === 0);

check("no pace set reads as nothing", readPace(0, done, doneAt, "2026-08-20") === null);
check("every offered choice is usable", PACE_CHOICES.every((n) => (readPace(n, done, doneAt, "2026-08-20")?.target ?? 0) === n));

console.log(`\npassed ${pass}, failed ${fail}`);
if (fail) process.exit(1);
