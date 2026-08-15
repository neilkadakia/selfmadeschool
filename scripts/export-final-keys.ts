// Build-time export of the finals answer key for the PHP API.
//
// The client bundle necessarily carries quiz answers (unit knowledge checks
// give instant feedback), but the FINAL is graded server-side so the record
// behind a certificate is one the school asserts, not the browser.
// This script is the single source of truth handoff: it reads the course
// data and writes api/final-keys.json (web access denied by api/.htaccess),
// which finals.php grades against. Runs on every `npm run build` (prebuild).

import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { COURSES, courseUnits, FINAL_PASS, FINAL_QUESTIONS } from "../lib/lms";

type CourseKey = {
  units: string[];
  answers: Record<string, number[]>;
};

const courses: Record<string, CourseKey> = {};

for (const course of COURSES) {
  const units = courseUnits(course).map((u) => u.slug);
  const answers: Record<string, number[]> = {};
  for (const slug of units) {
    const lesson = course.lessons[slug];
    if (lesson) answers[slug] = lesson.quiz.map((q) => q.answer);
  }
  courses[course.slug] = { units, answers };
}

const out = {
  pass: FINAL_PASS,
  questions: FINAL_QUESTIONS,
  courses,
};

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const path = join(root, "api", "final-keys.json");
writeFileSync(path, JSON.stringify(out));

const totals = Object.entries(courses)
  .map(([slug, c]) => `${slug}: ${Object.values(c.answers).reduce((a, b) => a + b.length, 0)}q/${c.units.length}u`)
  .join(", ");
console.log(`final-keys.json written (${totals})`);
