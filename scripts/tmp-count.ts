import { COURSES, courseUnits, getLesson } from "../lib/lms";
for (const c of COURSES) {
  let n = 0;
  let bad = 0;
  for (const u of courseUnits(c)) {
    const l = getLesson(c, u.slug);
    for (const q of l?.quiz ?? []) {
      n++;
      const lens = q.options.map((o) => o.length);
      const others = lens.filter((_, k) => k !== q.answer);
      if (lens[q.answer] > Math.max(...others)) bad++;
    }
  }
  console.log(`${c.slug}: ${n} questions, ${bad} with the longest-answer tell`);
}
