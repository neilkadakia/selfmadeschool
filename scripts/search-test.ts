import { searchLessons } from "../lib/search";
import { COURSES, courseUnits, getLesson } from "../lib/lms";
let pass = 0, fail = 0;
const check = (l: string, c: boolean) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}`); };

// The phrase comes out of a real paragraph rather than being typed in here.
// A hard-coded sentence tests that one lesson still says one thing, which is
// not what this is for and which goes stale the next time a unit is rewritten.
function phraseFromProse(): string {
  for (const course of COURSES) {
    for (const unit of courseUnits(course)) {
      const lesson = getLesson(course, unit.slug);
      const para = lesson?.blocks.find((b) => b.kind === "p" && b.text.split(/\s+/).length > 30);
      if (para && para.kind === "p") {
        // A run of five plain words, punctuation and all skipped: the query has
        // to appear in the source verbatim, so a slice that swallows a comma or
        // a full stop would be testing the wrong thing.
        const words = para.text.split(/\s+/).filter(Boolean);
        for (let i = 0; i + 5 <= words.length; i++) {
          const run = words.slice(i, i + 5);
          if (run.every((w) => /^[A-Za-z]+$/.test(w))) return run.join(" ");
        }
      }
    }
  }
  return "";
}

const phrase = phraseFromProse();
const card = searchLessons(phrase);
check(`finds a phrase buried in lesson prose ("${phrase}")`, card.length > 0);
if (card[0]) console.log(`      ${card[0].unitTitle} [${card[0].kind}] ${card[0].snippet}`);

const utilisation = searchLessons("utilization");
check("finds a word that appears only in a flashcard or explanation", utilisation.length > 0);
if (utilisation[0]) console.log(`      ${utilisation[0].unitTitle} [${utilisation[0].kind}] ${utilisation[0].snippet}`);

const title = searchLessons("emergency funds");
check("a unit title still outranks body text", title[0]?.unit === "emergency-funds");

const dedup = searchLessons("money");
const keys = dedup.map((h) => `${h.course}/${h.unit}`);
check("one row per unit", new Set(keys).size === keys.length);

check("a one-character query returns nothing", searchLessons("a").length === 0);
check("nonsense returns nothing", searchLessons("qzzxwv").length === 0);

const snip = searchLessons("deductible")[0];
check("snippets are trimmed, not whole paragraphs", !snip || snip.snippet.length < 140);
if (snip) console.log(`      ${snip.unitTitle} [${snip.kind}] ${snip.snippet}`);

console.log(`\npassed ${pass}, failed ${fail}`);
if (fail) process.exit(1);
