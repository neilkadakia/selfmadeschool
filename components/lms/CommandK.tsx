"use client";

// Ctrl/Cmd+K palette: search every word of every lesson.
//
// With no query it lists the units, which is what it always did. Type two
// characters and it searches the lesson text, takeaways, flashcards, quiz
// questions and Field Work, and shows the line it matched.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { COURSES, courseUnits } from "@/lib/lms";
import { searchLessons, type Hit } from "@/lib/search";

// One row in the palette, whether it came from the unit list or a search.
type Row = {
  course: string;
  unit: string;
  title: string;
  courseTitle: string;
  tone: string;
  number: number;
  kind: Hit["kind"];
  snippet: string;
};

type Entry = {
  course: string;
  courseTitle: string;
  tone: string;
  slug: string;
  title: string;
  blurb: string;
  number: number;
};

export default function CommandK() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const entries = useMemo<Entry[]>(
    () =>
      COURSES.flatMap((c) =>
        courseUnits(c).map((u) => ({
          course: c.slug,
          courseTitle: c.title,
          tone: c.tone,
          slug: u.slug,
          title: u.title,
          blurb: u.blurb,
          number: u.number,
        }))
      ),
    []
  );

  // With nothing typed, the unit list. Typing searches the lessons.
  const results = useMemo<Row[]>(() => {
    const q = query.trim();
    if (q.length < 2) {
      return entries.slice(0, 8).map((e) => ({
        course: e.course,
        unit: e.slug,
        title: e.title,
        courseTitle: e.courseTitle,
        tone: e.tone,
        number: e.number,
        kind: "Unit" as const,
        snippet: e.blurb,
      }));
    }
    return searchLessons(q, 8).map((h: Hit) => ({
      course: h.course,
      unit: h.unit,
      title: h.unitTitle,
      courseTitle: h.courseTitle,
      tone: h.tone,
      number: h.number,
      kind: h.kind,
      snippet: h.snippet,
    }));
  }, [entries, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
        setActive(0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const go = (r: Row) => {
    setOpen(false);
    router.push(`/learn/${r.course}/${r.unit}`);
  };

  return (
    <div className="lms-palette-overlay" onClick={() => setOpen(false)}>
      <div
        className="lms-palette"
        role="dialog"
        aria-label="Jump to a unit"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="lms-palette-input"
          placeholder="Search every word of every lesson…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            }
            if (e.key === "Enter" && results[active]) go(results[active]);
          }}
        />
        <div className="lms-palette-results">
          {results.length === 0 && <p className="lms-palette-empty">Nothing found. Try a shorter word.</p>}
          {results.map((r, i) => (
            <button
              key={`${r.course}/${r.unit}`}
              className={`lms-palette-row${i === active ? " is-active" : ""}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(r)}
            >
              <span className="lms-palette-head">
                <span className="lms-palette-title">{r.title}</span>
                {r.kind !== "Unit" && <span className="lms-palette-kind">{r.kind}</span>}
              </span>
              <span className="lms-palette-snippet">{r.snippet}</span>
              <span className={`lms-palette-course tone-${r.tone}`}>
                {r.courseTitle} · {String(r.number).padStart(2, "0")}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
