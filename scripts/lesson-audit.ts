// Is the unit actually teaching, and is it written in the house voice?
//
// quiz-audit.ts already guards the knowledge check. This is its cousin for
// the lesson body: the checks that are cheap to run and expensive to notice
// by eye across thirty units.
//
// What it looks for, in the order the failures actually happen:
//
//   voice     em dashes and the banned vocabulary, which are the house's
//             loudest tells and the thing most often reintroduced
//   depth     a unit under the floor is a blurb wearing a lesson's clothes
//   rhythm    three plain paragraphs in a row is the wall of text this
//             whole graphic vocabulary exists to prevent
//   position  a quiz explanation that says "the first option" is wrong the
//             moment it renders, because lib/shuffle.ts moves the options
//
// Run: npx tsx scripts/lesson-audit.ts [--strict]
// --strict exits 1 on any error. Warnings never fail the build.

import { COURSES, courseUnits, getLesson, type Lesson, type LessonBlock } from "../lib/lms";

const strict = process.argv.includes("--strict");

// The floor, not the target. A unit under this is not a lesson yet.
const MIN_WORDS = 1400;
const MIN_GRAPHICS = 2;
const GRAPHIC_KINDS = new Set(["split", "steps", "bars", "flow", "timeline", "receipt", "scale", "table", "art"]);

// Words the house does not use. Each is a whole-word match so "repetition"
// and "moduler" style false positives stay out of the report.
const BANNED = [
  "rep", "reps", "module", "modules",
  "delve", "delving", "unlock", "unlocking", "elevate", "empower", "empowering",
  "seamless", "robust", "landscape", "game-changer", "gamechanger",
];

// Words that are banned in one sense and ordinary English in another, which
// no regex can separate. Reported so a person looks, never fatal.
//   kids/teens   our students, no; the reader's own children, fine
//   leverage     the corporate verb, no; the noun for bargaining power in a
//                unit about negotiating, which is simply the right word
const CHECK_BY_HAND: Record<string, string> = {
  kids: "the reader's own children is fine, our students is not",
  teens: "the reader's own children is fine, our students is not",
  leverage: "the noun for bargaining power is fine, the corporate verb is not",
};

// Explanations are rendered next to shuffled options, so any of these makes
// the sentence describe an order the student is not looking at.
const POSITIONAL = [
  /\bthe (first|second|third|fourth|last) (option|answer|choice)\b/i,
  /\boption [abcd]\b/i,
  /\banswer [abcd]\b/i,
];

// "the second one" is usually ordinary English pointing at something in the
// question itself ("writing and sending are two decisions, and only the
// second one costs you"). Too common to fail a build over, too dangerous to
// ignore, so it gets a look rather than a veto.
const MAYBE_POSITIONAL = /\bthe (first|second|third|fourth|last) one\b/i;

type Problem = { unit: string; level: "error" | "warn"; what: string };
const problems: Problem[] = [];

function add(unit: string, level: "error" | "warn", what: string) {
  problems.push({ unit, level, what });
}

// Every string a reader reads. Walks the tree rather than stringifying it, so
// keys and JSON punctuation never count as words.
function strings(value: unknown, skip: Set<string>): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((v) => strings(v, skip));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => (skip.has(k) ? [] : strings(v, skip)));
  }
  return [];
}

const SKIP = new Set(["kind", "art", "src", "href", "poster"]);

function words(v: unknown): number {
  return strings(v, SKIP).reduce((n, s) => n + s.trim().split(/\s+/).filter(Boolean).length, 0);
}

function wholeWord(w: string): RegExp {
  return new RegExp(`(^|[^\\w-])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\w-])`, "i");
}

function checkVoice(unit: string, texts: string[]) {
  for (const t of texts) {
    if (/[—–]/.test(t)) {
      add(unit, "error", `dash in: "${t.slice(0, 70)}"`);
    }
    for (const w of BANNED) {
      if (wholeWord(w).test(t)) add(unit, "error", `banned word "${w}" in: "${t.slice(0, 70)}"`);
    }
    for (const [w, why] of Object.entries(CHECK_BY_HAND)) {
      if (wholeWord(w).test(t)) add(unit, "warn", `"${w}" needs a human read: ${why}`);
    }
  }
}

function checkRhythm(unit: string, blocks: LessonBlock[]) {
  let run = 0;
  let worst = 0;
  for (const b of blocks) {
    run = b.kind === "p" ? run + 1 : 0;
    worst = Math.max(worst, run);
  }
  if (worst >= 4) add(unit, "error", `${worst} plain paragraphs in a row`);
  else if (worst === 3) add(unit, "warn", "three plain paragraphs in a row");

  const graphics = blocks.filter((b) => GRAPHIC_KINDS.has(b.kind)).length;
  if (graphics < MIN_GRAPHICS) add(unit, "error", `only ${graphics} graphic block(s)`);

  // Two graphics back to back read as a dashboard, not a lesson.
  for (let i = 1; i < blocks.length; i++) {
    if (GRAPHIC_KINDS.has(blocks[i].kind) && GRAPHIC_KINDS.has(blocks[i - 1].kind)) {
      add(unit, "warn", `two graphics in a row (${blocks[i - 1].kind} then ${blocks[i].kind})`);
    }
  }
}

function checkQuiz(unit: string, lesson: Lesson) {
  lesson.quiz.forEach((q, i) => {
    const at = `q${i + 1}`;
    if (q.options.length !== 4) add(unit, "error", `${at}: ${q.options.length} options`);
    if (q.answer < 0 || q.answer >= q.options.length) add(unit, "error", `${at}: answer out of range`);
    for (const re of POSITIONAL) {
      if (re.test(q.explain)) {
        add(unit, "error", `${at}: explanation names an option by position`);
        break;
      }
    }
    if (MAYBE_POSITIONAL.test(q.explain)) {
      add(unit, "warn", `${at}: "the Nth one" in the explanation, check it means the question and not an option`);
    }
    const lens = q.options.map((o) => o.length);
    const correct = lens[q.answer];
    const others = lens.filter((_, k) => k !== q.answer);
    if (correct > Math.max(...others) + 8) add(unit, "warn", `${at}: correct option is the long one`);
    if (correct < Math.min(...others) - 8) add(unit, "warn", `${at}: correct option is the short one`);
  });

  const spread = new Set(lesson.quiz.map((q) => q.answer)).size;
  if (lesson.quiz.length >= 4 && spread < 2) add(unit, "warn", "every answer sits at the same index");
}

let audited = 0;

for (const course of COURSES) {
  for (const unit of courseUnits(course)) {
    const lesson = getLesson(course, unit.slug);
    if (!lesson) continue;
    audited++;
    const key = `${course.slug}/${unit.slug}`;

    const n = words(lesson.blocks);
    if (n < MIN_WORDS) add(key, "error", `body is ${n} words, floor is ${MIN_WORDS}`);

    checkVoice(key, strings(lesson, SKIP));
    checkRhythm(key, lesson.blocks);
    checkQuiz(key, lesson);

    if (lesson.quiz.length !== 6) add(key, "warn", `${lesson.quiz.length} quiz questions, house standard is 6`);
    if (lesson.cards.length < 8) add(key, "warn", `${lesson.cards.length} flashcards, house standard is 8 or 9`);
    if (!lesson.takeaways?.length) add(key, "error", "no key takeaways");
    else if (lesson.takeaways.length < 7) add(key, "warn", `${lesson.takeaways.length} takeaways, house standard is 7 to 9`);
    if (!lesson.theLesson) add(key, "error", "no theLesson line");
    if (!lesson.action?.trim()) add(key, "error", "no Field Work action");
  }
}

const errors = problems.filter((p) => p.level === "error");
const warns = problems.filter((p) => p.level === "warn");

const byUnit = new Map<string, Problem[]>();
for (const p of problems) {
  if (!byUnit.has(p.unit)) byUnit.set(p.unit, []);
  byUnit.get(p.unit)!.push(p);
}

for (const [unit, list] of byUnit) {
  console.log(`\n${unit}`);
  for (const p of list) console.log(`  ${p.level === "error" ? "ERROR" : " warn"}  ${p.what}`);
}

console.log(`\nlessons audited: ${audited}`);
console.log(`errors: ${errors.length}   warnings: ${warns.length}`);

if (strict && errors.length) {
  console.log("\nStrict mode: the errors above have to be fixed.");
  process.exit(1);
}
