// Search that reads the lessons.
//
// The palette used to match on unit titles and blurbs only, which meant a
// student who remembered "the thing about the 22 percent card" could not find
// it. Everything is already in the bundle, so there is no reason the words of
// the lesson should be unsearchable.
//
// The index is built once, lazily, the first time somebody searches. Building
// it at module load would cost every page that imports the palette.

import { COURSES, courseUnits, type Lesson, type LessonBlock } from "./lms";

export type Fragment = {
  course: string;
  courseTitle: string;
  tone: string;
  unit: string;
  unitTitle: string;
  number: number;
  /** What part of the unit this line came from, shown as a label. */
  kind: "Unit" | "Lesson" | "Takeaway" | "Flashcard" | "Question" | "Field Work";
  text: string;
  /** Title and blurb outrank body text, so a unit search finds the unit. */
  weight: number;
};

export type Hit = Fragment & { snippet: string; at: number };

// The readable text inside one block, whatever kind it is.
function blockText(b: LessonBlock): string {
  switch (b.kind) {
    case "p":
    case "h":
      return b.text;
    case "callout":
    case "example":
      return `${b.title}. ${b.text}`;
    case "bigfact":
      return `${b.stat} ${b.caption}`;
    case "list":
      return [b.title, ...b.items].filter(Boolean).join(". ");
    case "quote":
      return [b.text, b.who].filter(Boolean).join(" ");
    case "image":
      return [b.alt, b.caption].filter(Boolean).join(". ");
    case "video":
    case "audio":
      return [("title" in b && b.title) || "", b.caption ?? ""].filter(Boolean).join(". ");
    case "embed":
      return [b.title, b.caption].filter(Boolean).join(". ");
    case "file":
      return [b.name, b.note].filter(Boolean).join(". ");
    default:
      return "";
  }
}

let index: Fragment[] | null = null;

function build(): Fragment[] {
  const out: Fragment[] = [];
  for (const course of COURSES) {
    for (const unit of courseUnits(course)) {
      const base = {
        course: course.slug,
        courseTitle: course.title,
        tone: course.tone,
        unit: unit.slug,
        unitTitle: unit.title,
        number: unit.number,
      };
      out.push({ ...base, kind: "Unit", text: `${unit.title}. ${unit.blurb}`, weight: 100 });

      const lesson: Lesson | undefined = course.lessons[unit.slug];
      if (!lesson) continue;

      out.push({ ...base, kind: "Lesson", text: lesson.hook, weight: 60 });
      for (const b of lesson.blocks) {
        const t = blockText(b);
        if (t) out.push({ ...base, kind: "Lesson", text: t, weight: b.kind === "h" ? 50 : 30 });
      }
      for (const t of lesson.takeaways ?? []) {
        out.push({ ...base, kind: "Takeaway", text: t, weight: 45 });
      }
      if (lesson.theLesson) {
        out.push({ ...base, kind: "Takeaway", text: lesson.theLesson, weight: 55 });
      }
      for (const c of lesson.cards) {
        out.push({ ...base, kind: "Flashcard", text: `${c.front}. ${c.back}`, weight: 40 });
      }
      for (const q of lesson.quiz) {
        // The options are deliberately left out: three of the four are wrong,
        // and surfacing a wrong answer as a search result teaches the wrong
        // thing. The question and its explanation are the useful parts.
        out.push({ ...base, kind: "Question", text: `${q.q} ${q.explain}`, weight: 35 });
      }
      out.push({ ...base, kind: "Field Work", text: lesson.action, weight: 40 });
    }
  }
  return out;
}

/** About 90 characters around the match, cut on word boundaries. */
function snippetAround(text: string, at: number, term: number): string {
  const pad = 42;
  let start = Math.max(0, at - pad);
  let end = Math.min(text.length, at + term + pad);
  if (start > 0) {
    const sp = text.indexOf(" ", start);
    if (sp > -1 && sp < at) start = sp + 1;
  }
  if (end < text.length) {
    const sp = text.lastIndexOf(" ", end);
    if (sp > at + term) end = sp;
  }
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}

// One result per unit: the best-scoring fragment wins, so a search does not
// return the same unit eight times over.
export function searchLessons(query: string, limit = 8): Hit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  if (!index) index = build();

  const best = new Map<string, Hit>();
  for (const f of index) {
    const at = f.text.toLowerCase().indexOf(q);
    if (at === -1) continue;
    // A match at the start of a line beats one buried in the middle.
    const score = f.weight + (at === 0 ? 12 : 0);
    const key = `${f.course}/${f.unit}`;
    const prev = best.get(key);
    if (prev && prev.weight >= score) continue;
    best.set(key, { ...f, weight: score, snippet: snippetAround(f.text, at, q.length), at });
  }
  return [...best.values()].sort((a, b) => b.weight - a.weight || a.number - b.number).slice(0, limit);
}
