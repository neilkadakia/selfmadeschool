"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCourse, courseUnits, type LessonBlock } from "@/lib/lms";
import { questionKey } from "@/lib/mastery";
import { useLms } from "@/components/useLms";
import CommandK from "./CommandK";
import RewardToast from "./RewardToast";
import Quiz from "./Quiz";
import Deck from "./Deck";

// Exported for the public demo lesson, which renders the same blocks
// outside the auth gate.
export function Block({ block }: { block: LessonBlock }) {
  switch (block.kind) {
    case "p":
      return <p className="lms-p">{block.text}</p>;
    case "h":
      return <h2 className="lms-h2">{block.text}</h2>;
    case "callout":
      return (
        <aside className="lms-callout">
          <p className="lms-callout-title">{block.title}</p>
          <p className="lms-callout-text">{block.text}</p>
        </aside>
      );
    case "bigfact":
      return (
        <div className="lms-bigfact">
          <span className="lms-bigfact-stat">{block.stat}</span>
          <span className="lms-bigfact-caption">{block.caption}</span>
        </div>
      );
    case "list":
      return (
        <div className="lms-list">
          {block.title && <p className="lms-list-title">{block.title}</p>}
          <ul>
            {block.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      );
    case "example":
      return (
        <aside className="lms-example">
          <p className="lms-callout-title">{block.title}</p>
          <p className="lms-callout-text">{block.text}</p>
        </aside>
      );
  }
}

export default function Player({ courseSlug, unitSlug }: { courseSlug: string; unitSlug: string }) {
  const router = useRouter();
  const lms = useLms();
  const { state, loaded } = lms;
  const [sideOpen, setSideOpen] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  // On phones the syllabus is a full-screen sheet — lock the page behind it.
  useEffect(() => {
    document.body.style.overflow = sideOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sideOpen]);

  const course = getCourse(courseSlug);
  const units = course ? courseUnits(course) : [];
  const unit = units.find((u) => u.slug === unitSlug);
  const lesson = course && unit ? course.lessons[unit.slug] : undefined;
  const noteKey = `${courseSlug}/${unitSlug}`;

  const prev = unit && unit.number > 1 ? units[unit.number - 2] : undefined;
  const next = unit && unit.number < units.length ? units[unit.number] : undefined;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowLeft" && prev) router.push(`/learn/${courseSlug}/${prev.slug}`);
      if (e.key === "ArrowRight" && next) router.push(`/learn/${courseSlug}/${next.slug}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, courseSlug, router]);

  if (!course || !unit) return null;

  const done = state.done[course.slug] ?? [];
  const isDone = done.includes(unit.slug);

  return (
    <div className="lms-player">
      <CommandK />
      <RewardToast reward={lms.reward} onDone={lms.clearReward} />

      <button className="lms-side-toggle" onClick={() => setSideOpen((v) => !v)}>
        {sideOpen ? "Hide Syllabus" : "Show Syllabus"} · {done.length}/{units.length}
      </button>

      <aside className={`lms-side${sideOpen ? " is-open" : ""}`}>
        <Link href={`/learn/${course.slug}`} className="lms-side-course">
          ← {course.title}
        </Link>
        <div className="learn-bar lms-side-bar">
          {course.parts.map((part) => {
            const partDone = part.units.filter((u) => done.includes(u.slug)).length;
            return (
              <span
                key={part.id}
                className={`learn-bar-seg seg--${part.tone}`}
                style={{ width: `${(partDone / units.length) * 100}%` }}
              />
            );
          })}
        </div>
        {course.parts.map((part) => (
          <div key={part.id} className="lms-side-part">
            <p className={`lms-side-part-name tone-${part.tone}`}>{part.name}</p>
            {part.units.map((u) => {
              const flat = units.find((x) => x.slug === u.slug)!;
              const uDone = done.includes(u.slug);
              const isActive = u.slug === unit.slug;
              return (
                <Link
                  key={u.slug}
                  href={`/learn/${course.slug}/${u.slug}`}
                  className={`lms-side-unit${isActive ? " is-active" : ""}${uDone ? " is-done" : ""}`}
                  onClick={() => setSideOpen(false)}
                >
                  <span className="lms-side-check">{uDone ? "✓" : String(flat.number).padStart(2, "0")}</span>
                  <span className="lms-side-title">{u.title}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </aside>

      <main className="lms-main">
        <p className={`unit-kicker tone-${unit.part.tone}`}>
          {unit.part.name} · Unit {String(unit.number).padStart(2, "0")} of {units.length}
        </p>
        <h1 className="unit-h1">{unit.title}</h1>
        <p className="unit-blurb">{lesson ? lesson.hook : unit.blurb}</p>

        {lesson ? (
          <>
            <article className="lms-lesson">
              {lesson.blocks.map((b, i) => (
                <Block key={i} block={b} />
              ))}
            </article>

            <section className="lms-section">
              <h2 className="lms-section-h">Watch</h2>
              {unit.live ? (
                <div className="watch-frame">
                  <svg className="watch-play" viewBox="0 0 24 24" fill="none" stroke="#F2EEE3" strokeWidth="1.5" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M10 8.5v7l6-3.5z" fill="#F2EEE3" stroke="none" />
                  </svg>
                </div>
              ) : (
                <p className="lms-muted">Video in production — the written lesson above has you covered.</p>
              )}
            </section>

            <section className="lms-section" id="quiz">
              <h2 className="lms-section-h">Knowledge check</h2>
              <p className="lms-section-sub">
                Not a pop quiz — nothing is graded, and you can retake it forever. It exists so you
                know what stuck.
              </p>
              <Quiz
                questions={lesson.quiz}
                best={state.quizBest[noteKey]}
                onComplete={(correct, total) => lms.quizResult(courseSlug, unitSlug, correct, total)}
                onAnswer={(qi, ok) => lms.questionResult(questionKey(courseSlug, unitSlug, qi), ok)}
              />
            </section>

            <section className="lms-section">
              <h2 className="lms-section-h">Flashcards</h2>
              <p className="lms-section-sub">
                The unit in six cards — the version that stays with you after the tab closes.
              </p>
              <Deck
                cards={lesson.cards}
                done={state.decksDone.includes(noteKey)}
                onComplete={() => lms.deckDone(courseSlug, unitSlug)}
              />
            </section>

            <section className="panel panel--do lms-do">
              <p className="panel-kicker">Do</p>
              <p className="panel-title">Homework: your life</p>
              <p className="panel-body">{lesson.action}</p>
            </section>
          </>
        ) : (
          <div className="unit-panels">
            <div className="panel panel--read">
              <p className="panel-kicker">Read</p>
              <p className="panel-title">
                Chapter {unit.part.units.findIndex((u) => u.slug === unit.slug) + 1}
              </p>
              <p className="panel-body">
                This unit is chapter-first: the full treatment lives in the book, and the video is
                in production. The blurb version — {unit.blurb.toLowerCase()}
              </p>
            </div>
            <div className="panel panel--watch">
              <p className="panel-kicker">Watch</p>
              <p className="panel-title">Video in production</p>
              <p className="panel-body">This unit&apos;s video is being filmed. The chapter has you covered.</p>
            </div>
            <div className="panel panel--do">
              <p className="panel-kicker">Do</p>
              <p className="panel-title">Homework: your life</p>
              <p className="panel-body">{unit.part.action}</p>
            </div>
          </div>
        )}

        <section className="lms-section">
          <h2 className="lms-section-h">My notes</h2>
          <textarea
            key={`${noteKey}:${loaded}`}
            className="lms-notes"
            placeholder={"Write it in your own words — that's when it sticks."}
            defaultValue={state.notes[noteKey] ?? ""}
            onChange={() => setNoteSaved(false)}
            onBlur={(e) => {
              lms.saveNote(courseSlug, unitSlug, e.target.value);
              setNoteSaved(true);
            }}
            rows={4}
          />
          <p className="lms-notes-hint">{noteSaved ? "Saved ✓" : "Saves when you click away"}</p>
        </section>

        <div className="unit-actions">
          <button
            className={`btn ${isDone ? "btn--outline" : "btn--solid"} unit-done-btn`}
            onClick={() => lms.toggleDone(courseSlug, unitSlug)}
          >
            {isDone ? "Completed ✓ (Tap to Undo)" : "Mark Unit Complete"}
          </button>
        </div>

        <nav className="unit-nav">
          {prev ? (
            <Link href={`/learn/${courseSlug}/${prev.slug}`} className="unit-nav-link">
              ← {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/learn/${courseSlug}/${next.slug}`} className="unit-nav-link">
              {next.title} →
            </Link>
          ) : (
            <Link href={`/learn/${courseSlug}`} className="unit-nav-link">
              Finish — Back to Course →
            </Link>
          )}
        </nav>
        <p className="lms-hint">
          <kbd>←</kbd> <kbd>→</kbd> move between units · <kbd>Ctrl</kbd>+<kbd>K</kbd> jump anywhere
        </p>
      </main>
    </div>
  );
}
