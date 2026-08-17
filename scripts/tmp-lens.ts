// Per-question option lengths, so a rewrite can be aimed rather than guessed.
// Usage: npx tsx scripts/tmp-lens.ts [unitSlugFragment]
import { COURSES, courseUnits, getLesson } from "../lib/lms";

const filter = process.argv[2] ?? "";

for (const course of COURSES) {
  for (const unit of courseUnits(course)) {
    if (filter && !unit.slug.includes(filter)) continue;
    const lesson = getLesson(course, unit.slug);
    if (!lesson) continue;
    const flagged = lesson.quiz
      .map((q, qi) => {
        const lens = q.options.map((o) => o.length);
        const others = lens.filter((_, k) => k !== q.answer);
        const tell = lens[q.answer] > Math.max(...others);
        return { qi, q, lens, tell, correct: lens[q.answer], maxOther: Math.max(...others) };
      })
      .filter((r) => !filter || true);
    const bad = flagged.filter((r) => r.tell);
    if (filter || bad.length) {
      console.log(`\n${course.slug}/${unit.slug}  (${bad.length}/${lesson.quiz.length} with the tell)`);
      for (const r of flagged) {
        console.log(
          `  ${r.tell ? "TELL" : "ok  "} #${r.qi} answer=${r.q.answer} lens=[${r.lens.join(", ")}] correct=${r.correct} maxOther=${r.maxOther}`
        );
        if (r.tell) console.log(`        q: ${r.q.q}`);
      }
    }
  }
}
