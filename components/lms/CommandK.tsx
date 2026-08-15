"use client";

// Ctrl/Cmd+K palette: jump to any unit in any course.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { COURSES, courseUnits } from "@/lib/lms";

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

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries.slice(0, 8);
    return entries
      .filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.blurb.toLowerCase().includes(q) ||
          e.courseTitle.toLowerCase().includes(q)
      )
      .slice(0, 8);
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

  const go = (e: Entry) => {
    setOpen(false);
    router.push(`/learn/${e.course}/${e.slug}`);
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
          placeholder="Search every unit…"
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
              key={`${r.course}/${r.slug}`}
              className={`lms-palette-row${i === active ? " is-active" : ""}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(r)}
            >
              <span className="lms-palette-title">{r.title}</span>
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
