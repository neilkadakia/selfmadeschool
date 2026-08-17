// Build-time export of the course data the PHP API needs.
//
// The client bundle necessarily carries quiz answers (unit knowledge checks
// give instant feedback), but the FINAL is graded server-side so the record
// behind a certificate is one the school asserts, not the browser.
// This script is the single source of truth handoff. It writes two files
// into api/ (web access denied by api/.htaccess), on every `npm run build`:
//
//   final-keys.json  the answer key finals.php grades against
//   catalog.json     course and unit titles, so the server can name things
//                    in emails, the Faculty Lounge, and the records office
//                    without a second copy of the curriculum to keep in sync
//
// Anything the API needs to know about the courses comes from here. Nothing
// on the server should ever hard-code a unit slug or a course title again.

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

// ---- catalog.json: what the courses are called ----

const catalog = {
  generated: new Date().toISOString(),
  courses: COURSES.map((course) => ({
    slug: course.slug,
    title: course.title,
    kicker: course.kicker,
    tone: course.tone,
    status: course.status,
    description: course.description,
    parts: course.parts.map((p) => ({ id: p.id, name: p.name, tone: p.tone })),
    units: courseUnits(course).map((u) => {
      const lesson = course.lessons[u.slug];
      return {
        slug: u.slug,
        title: u.title,
        blurb: u.blurb,
        part: u.part.id,
        partName: u.part.name,
        number: u.number,
        // A unit without a lesson is on the syllabus but not yet written:
        // the Faculty Lounge greys those out instead of counting them
        // against a student who could never have finished them.
        taught: Boolean(lesson),
        questions: lesson ? lesson.quiz.length : 0,
        cards: lesson ? lesson.cards.length : 0,
        action: lesson?.action ?? "",
        // The prompts only, in order, so the records office can name the
        // question the class keeps missing. The answers stay in
        // final-keys.json, which nothing but the Registrar reads.
        asks: lesson ? lesson.quiz.map((q) => q.q) : [],
      };
    }),
  })),
};

writeFileSync(join(root, "api", "catalog.json"), JSON.stringify(catalog));
const taught = catalog.courses.map(
  (c) => `${c.slug}: ${c.units.filter((u) => u.taught).length}/${c.units.length} taught`
);
console.log(`catalog.json written (${taught.join(", ")})`);
