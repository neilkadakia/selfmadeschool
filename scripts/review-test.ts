// Does the spacing schedule actually behave? Dates and boxes are the kind of
// thing that looks right and is off by a day.
import {
  BOX_DAYS,
  TOP_BOX,
  schedule,
  isDue,
  readEntry,
  dueQuestions,
  reviewShape,
  nextDueDay,
  localDay,
  type MasteryEntry,
  type MasteryMap,
} from "../lib/mastery";

let pass = 0;
let fail = 0;
const check = (label: string, cond: boolean) => {
  if (cond) {
    pass++;
    console.log(`PASS  ${label}`);
  } else {
    fail++;
    console.log(`FAIL  ${label}`);
  }
};

// A brand new question, answered right, waits one day.
const first = schedule(undefined, true);
check("a right answer starts at box 1", first.box === 1);
check("and comes back in 3 days", first.due === localDay(BOX_DAYS[1]));
check("and is not due today", !isDue(first));

// Climbing the ladder.
let e: MasteryEntry = schedule(undefined, true);
for (let i = 1; i < TOP_BOX; i++) e = schedule(e, true);
check("right answers climb to the top box", e.box === TOP_BOX);
check("the top box waits the longest", e.due === localDay(BOX_DAYS[TOP_BOX]));
const beyond = schedule(e, true);
check("the top box does not overflow", beyond.box === TOP_BOX);

// One wrong answer drops it all the way down, whatever it had climbed.
const dropped = schedule(e, false);
check("a wrong answer drops to the bottom box", dropped.box === 0);
check("and brings it back tomorrow", dropped.due === localDay(BOX_DAYS[0]));
check("and counts the miss", dropped.miss === e.miss + 1);
check("and resets the streak", dropped.streak === 0);

// Entries written before scheduling existed still have to work.
const legacyMissed: MasteryEntry = { miss: 3, streak: 0, last: "2026-01-01" };
const legacyRetired: MasteryEntry = { miss: 1, streak: 2, last: "2026-01-01" };
check("a legacy missed question reads as due", isDue(legacyMissed));
check("a legacy missed question sits in box 0", readEntry(legacyMissed).box === 0);
check("a legacy retired question rests higher", readEntry(legacyRetired).box === 3);
check("a legacy retired question is still due once", isDue(legacyRetired));
const promoted = schedule(legacyRetired, true);
check("answering a legacy entry puts it on the schedule", promoted.box === 4 && Boolean(promoted.due));

// Nothing is due before its day.
const notYet: MasteryEntry = { miss: 0, streak: 1, last: localDay(), box: 2, due: localDay(5) };
check("a question due in 5 days is not due now", !isDue(notYet));

// The queue: overdue leads, then the shakiest.
const map: MasteryMap = {
  "the-13th-grade/mindset-hacks#0": { miss: 0, streak: 1, last: "", box: 3, due: localDay(-9) },
  "the-13th-grade/mindset-hacks#1": { miss: 2, streak: 0, last: "", box: 0, due: localDay(-1) },
  "the-13th-grade/mindset-hacks#2": { miss: 0, streak: 1, last: "", box: 2, due: localDay(30) },
};
const owed = dueQuestions(map);
check("only what is owed comes back", owed.length === 2);
check("the longest overdue leads", owed[0].key.endsWith("#0"));
check("overdue days are counted", owed[0].overdueDays === 9);

// The shape used by the header.
const shape = reviewShape(map);
check("the ladder counts every tracked question", shape.tracked === 3);
check("the ladder counts what is due", shape.due === 2);
check("the ladder buckets by box", shape.boxes[3] === 1 && shape.boxes[0] === 1 && shape.boxes[2] === 1);
check("the next due day is the earliest", nextDueDay(map) === localDay(-9));

// A question you keep getting right disappears for months, not forever.
let long: MasteryEntry = schedule(undefined, true);
for (let i = 0; i < 10; i++) long = schedule(long, true);
check("a well-known question still has a return date", Boolean(long.due));
check("and it is the longest interval, not never", long.due === localDay(BOX_DAYS[TOP_BOX]));

console.log(`\npassed ${pass}, failed ${fail}`);
if (fail > 0) process.exit(1);
