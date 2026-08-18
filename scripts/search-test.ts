import { searchLessons } from "../lib/search";
let pass = 0, fail = 0;
const check = (l: string, c: boolean) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}`); };

const card = searchLessons("guaranteed 22");
check("finds a phrase buried in lesson prose", card.length > 0);
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
