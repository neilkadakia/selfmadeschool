// Is the quiz actually testing anything?
//
// Two habits creep into hand-written multiple choice and both let a student
// score well while knowing nothing:
//
//   position  the correct option keeps landing in the same slot
//   length    the correct option is written longer and more carefully than
//             the distractors, so "pick the wordy one" beats studying
//
// The first is now handled at render time (lib/shuffle.ts moves the options
// on every attempt), so this reports it for authoring hygiene rather than as
// a live exploit. The second cannot be fixed by shuffling: it lives in the
// words, and only rewriting the distractors fixes it.
//
// Run: npx tsx scripts/quiz-audit.ts [--strict]
// --strict exits 1 when the length tell is worse than the threshold.

import { COURSES, courseUnits, getLesson } from "../lib/lms";
import { seedFrom, shuffledOptions } from "../lib/shuffle";

// Over this share of questions where the correct option is the noticeably
// longest, a student can pass on instinct alone.
const LIMIT = 0.35;

// A one-character difference is not a tell; nobody counts letters. This is
// roughly a word and a half, which is the point at which one option starts
// visibly standing out from the others.
const NOTICEABLE = 8;

type Row = {
  key: string;
  answer: number;
  lens: number[];
  correctIsLongest: boolean;
  correctIsShortest: boolean;
  ratio: number;
};

const rows: Row[] = [];
let remapBroken = 0;

for (const course of COURSES) {
  for (const unit of courseUnits(course)) {
    const lesson = getLesson(course, unit.slug);
    if (!lesson) continue;
    lesson.quiz.forEach((q, qi) => {
      if (!q.options || q.options.length < 2) return;
      const key = `${course.slug}/${unit.slug}#${qi}`;
      const lens = q.options.map((o) => o.length);
      const correctLen = lens[q.answer];
      const others = lens.filter((_, k) => k !== q.answer);
      const maxOther = Math.max(...others);
      rows.push({
        key,
        answer: q.answer,
        lens,
        correctIsLongest: correctLen > maxOther + NOTICEABLE,
        correctIsShortest: correctLen < Math.min(...others) - NOTICEABLE,
        ratio: correctLen / (others.reduce((a, b) => a + b, 0) / others.length),
      });

      // The invariant the Final depends on: whatever seat the right answer
      // is shuffled into, order maps it back to the authored index.
      for (let attempt = 0; attempt < 6; attempt++) {
        const s = shuffledOptions(q.options, q.answer, seedFrom(`${key}|${attempt}`));
        if (s.order[s.answer] !== q.answer) remapBroken++;
        if (s.options[s.answer] !== q.options[q.answer]) remapBroken++;
      }
    });
  }
}

const total = rows.length;
const pos = [0, 0, 0, 0];
rows.forEach((r) => pos[r.answer]++);
const longest = rows.filter((r) => r.correctIsLongest).length;
// The mirror image: trimming every correct answer would just move the tell.
const shortest = rows.filter((r) => r.correctIsShortest).length;
const meanRatio = rows.reduce((a, r) => a + r.ratio, 0) / total;

const pct = (n: number) => `${Math.round((n / total) * 100)}%`;

console.log(`questions: ${total}`);
console.log(`answer position A/B/C/D as authored: ${pos.join(" / ")}  (${pos.map(pct).join(" / ")})`);
console.log(`   shuffled at render, so this is hygiene, not an exploit`);
console.log(`correct option noticeably longest: ${longest} (${pct(longest)})`);
console.log(`correct option noticeably shortest: ${shortest} (${pct(shortest)})`);
console.log(`correct option length vs mean distractor: ${meanRatio.toFixed(2)}x`);
console.log(`shuffle remap check: ${remapBroken === 0 ? "sound" : `BROKEN in ${remapBroken} cases`}`);

const worst = rows
  .filter((r) => r.correctIsLongest)
  .sort((a, b) => b.ratio - a.ratio)
  .slice(0, 15);
if (worst.length) {
  console.log(`\nworst length tells:`);
  worst.forEach((r) => console.log(`  ${r.ratio.toFixed(1)}x  ${r.key}`));
}

const strict = process.argv.includes("--strict");
if (remapBroken > 0) {
  console.error("\nThe shuffle remap is broken. The Final would mark right answers wrong.");
  process.exit(1);
}
if (strict && shortest / total > LIMIT) {
  console.error(
    `
The tell just moved: ${pct(shortest)} of questions hand the answer to anyone who picks the shortest option.`
  );
  process.exit(1);
}
if (strict && longest / total > LIMIT) {
  console.error(
    `\nThe length tell is too strong: ${pct(longest)} of questions hand the answer to anyone who picks the longest option (limit ${Math.round(LIMIT * 100)}%).`
  );
  process.exit(1);
}
