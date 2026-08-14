"use client";

// The open-house lesson: Unit 01 (Mindset Hacks), full strength, no
// account needed. Same blocks, knowledge check, and flashcards the
// enrolled course uses — progress just isn't saved. Closes with the
// waitlist, because the other 23 units are behind the pre-launch gate.

import Link from "next/link";
import { getCourse, courseUnits, getLesson } from "@/lib/lms";
import { Block } from "@/components/lms/Player";
import Quiz from "@/components/lms/Quiz";
import Deck from "@/components/lms/Deck";

const COURSE_SLUG = "the-13th-grade";
const UNIT_SLUG = "mindset-hacks";

export default function DemoLesson() {
  const course = getCourse(COURSE_SLUG);
  const unit = course ? courseUnits(course).find((u) => u.slug === UNIT_SLUG) : undefined;
  const lesson = course ? getLesson(course, UNIT_SLUG) : undefined;
  if (!course || !unit || !lesson) return null;

  return (
    <div className="unit-page demo">
      <div className="learn-wrap demo-wrap">
        <p className="kicker kicker--acc">Demo Lesson — Open to Everyone</p>
        <h1 className="learn-h1">{unit.title}</h1>
        <p className="learn-sub demo-hook">{lesson.hook}</p>
        <p className="demo-note">
          This is Unit 01 of {course.title}, exactly as students get it. We&apos;re pre-launch and
          class is invite-only, so the other 23 units stay behind the door for now — the{" "}
          <Link href="/#newsletter">waitlist</Link> is how you get in.
        </p>

        <article className="demo-lesson">
          {lesson.blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </article>

        <section className="lms-do" aria-label="Knowledge check">
          <h2 className="lms-section-h">Knowledge check</h2>
          <p className="lms-section-sub">
            Four questions, instant feedback. In class, your best score follows you.
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
            worth printing. Doors open soon — the waitlist hears first.
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
