"use client";

// The open-house lesson: Unit 01 (Mindset Hacks), full strength, no
// account needed. Same blocks, knowledge check, and flashcards the
// enrolled course uses. Progress just isn't saved. Closes with the
// waitlist, because the other 23 units are behind the pre-launch gate.

import Link from "next/link";
import { getCourse, courseUnits, getLesson } from "@/lib/lms";
import { Block, Takeaways } from "@/components/lms/Player";
import Quiz from "@/components/lms/Quiz";
import Deck from "@/components/lms/Deck";

const COURSE_SLUG = "the-13th-grade";
const UNIT_SLUG = "mindset-hacks";

// Every string a reader actually reads, counted. Walks the block tree rather
// than stringifying it, so JSON punctuation and the keys never get counted as
// words, and a new block kind is included without anyone remembering to.
function countWords(value: unknown): number {
  if (typeof value === "string") return value.trim().split(/\s+/).filter(Boolean).length;
  if (Array.isArray(value)) return value.reduce((n: number, v) => n + countWords(v), 0);
  if (value && typeof value === "object") {
    return Object.entries(value).reduce(
      (n, [key, v]) => (key === "kind" || key === "art" || key === "src" || key === "href" ? n : n + countWords(v)),
      0
    );
  }
  return 0;
}

export default function DemoLesson() {
  const course = getCourse(COURSE_SLUG);
  const unit = course ? courseUnits(course).find((u) => u.slug === UNIT_SLUG) : undefined;
  const lesson = course ? getLesson(course, UNIT_SLUG) : undefined;
  if (!course || !unit || !lesson) return null;

  // Reading time from the words actually on the page, at a deliberately
  // unhurried 200 wpm. Counted here rather than typed into the copy, so
  // rewriting the unit can never leave a stale number behind.
  const minutes = Math.max(1, Math.round(countWords(lesson.blocks) / 200));

  return (
    <div className="unit-page demo">
      <div className="learn-wrap demo-wrap">
        <p className="kicker kicker--acc">Demo Lesson · Open to Everyone</p>
        <h1 className="learn-h1">{unit.title}</h1>
        <p className="learn-sub demo-hook">{lesson.hook}</p>
        <ul className="demo-stats" aria-label="What is in this unit">
          <li>
            <span className="demo-stat-n">{minutes}</span>
            <span className="demo-stat-l">Minute Read</span>
          </li>
          <li>
            <span className="demo-stat-n">{lesson.quiz.length}</span>
            <span className="demo-stat-l">Questions</span>
          </li>
          <li>
            <span className="demo-stat-n">{lesson.cards.length}</span>
            <span className="demo-stat-l">Flashcards</span>
          </li>
          <li>
            <span className="demo-stat-n">1</span>
            <span className="demo-stat-l">Thing To Do Tonight</span>
          </li>
        </ul>

        <p className="demo-note">
          This is Unit 01 of {course.title}, exactly as students get it. We&apos;re pre-launch and
          class is invite-only, so the other 23 units stay behind the door for now. The{" "}
          <Link href="/#newsletter">waitlist</Link> is how you get in.
        </p>

        <article className="demo-lesson">
          {lesson.blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </article>

        <Takeaways takeaways={lesson.takeaways} theLesson={lesson.theLesson} />

        <section className="lms-do" aria-label="Knowledge check">
          <h2 className="lms-section-h">Knowledge check</h2>
          <p className="lms-section-sub">
            {lesson.quiz.length} questions, instant feedback. In class, your best score follows you.
          </p>
          <Quiz questions={lesson.quiz} best={undefined} onComplete={() => {}} />
        </section>

        <section className="lms-do" aria-label="Flashcards">
          <h2 className="lms-section-h">Flashcards</h2>
          <p className="lms-section-sub">Tap to flip. The ideas, compressed for keeps.</p>
          <Deck cards={lesson.cards} done={false} onComplete={() => {}} />
        </section>

        <aside className="lms-callout demo-action">
          <p className="lms-callout-title">Do the thing</p>
          <p className="lms-callout-text">{lesson.action}</p>
        </aside>

        <section className="demo-close" aria-label="Join the waitlist">
          <p className="kicker kicker--acc">That Was 1 of 24 Units</p>
          <h2 className="lms-section-h demo-close-h">The rest is waiting for the founding class.</h2>
          <p className="lms-section-sub">
            Streaks, XP, flashcard decks for every unit, a final with honors, and a certificate
            worth printing. Doors open soon. The waitlist hears first.
          </p>
          <div className="demo-close-ctas">
            <Link href="/#newsletter" className="btn btn--solid">
              Join the Waitlist
            </Link>
            <Link href="/learn" className="btn btn--outline">
              Already Enrolled? Sign In
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
