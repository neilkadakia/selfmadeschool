"use client";

// Study Hall: two phases now.
// 1) The Make-Up Test: questions you've missed anywhere (unit checks,
//    Arena fights) come back until you answer each right twice in a
//    row. Mastery logic lives in lib/mastery + useLms.questionResult.
// 2) Flashcards from completed units, weakest checks first.

import Link from "next/link";
import { useMemo, useState } from "react";
import { COURSES, courseUnits } from "@/lib/lms";
import {
  MAKEUP_SESSION_SIZE,
  BOX_DAYS,
  BOX_LABEL,
  dueQuestions,
  reviewShape,
  nextDueDay,
  localDay,
  type DueQuestion,
} from "@/lib/mastery";
import { seedFrom, shuffled } from "@/lib/shuffle";
import { useLms } from "@/components/useLms";
import { usDate } from "@/lib/format";
import CommandK from "./CommandK";
import RewardToast from "./RewardToast";

const SESSION_SIZE = 20;

type ReviewCard = { front: string; back: string; source: string };

function MakeupTest({ due, onDone }: { due: DueQuestion[]; onDone: () => void }) {
  const lms = useLms();
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const item = due[i];
  const q = item.question;

  return (
    <div className="lms-quiz lms-makeup">
      <div className="lms-quiz-head">
        <span className="lms-quiz-progress">
          Review {i + 1} of {due.length}
        </span>
        <span className="lms-quiz-best">
          {item.source} · {BOX_LABEL[item.box]}
          {item.overdueDays > 0 ? ` · ${item.overdueDays}d overdue` : ""}
        </span>
      </div>
      <p className="lms-quiz-q">{q.q}</p>
      <div className="lms-quiz-options">
        {q.options.map((opt, oi) => {
          const isPicked = picked === oi;
          const isAnswer = q.answer === oi;
          let cls = "lms-quiz-opt";
          if (picked !== null && isAnswer) cls += " is-right";
          else if (isPicked && !isAnswer) cls += " is-wrong";
          return (
            <button
              key={oi}
              className={cls}
              disabled={picked !== null}
              onClick={() => {
                setPicked(oi);
                lms.questionResult(item.key, oi === q.answer);
              }}
            >
              <span className="lms-quiz-letter">{String.fromCharCode(65 + oi)}</span>
              {opt}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className={`lms-quiz-explain${picked === q.answer ? " is-right" : ""}`}>
          <strong>
            {picked === q.answer
              ? item.box >= BOX_DAYS.length - 1
                ? `Right. Back in ${BOX_DAYS[BOX_DAYS.length - 1]} days.`
                : `Right. Back in ${BOX_DAYS[item.box + 1]} days.`
              : "Not yet. This one comes back tomorrow."}
          </strong>{" "}
          {q.explain}
        </div>
      )}
      {picked !== null && (
        <button
          className="btn btn--solid lms-quiz-btn"
          onClick={() => {
            if (i + 1 < due.length) {
              setI(i + 1);
              setPicked(null);
            } else {
              onDone();
            }
          }}
        >
          {i + 1 < due.length ? "Next Make-Up →" : "On to the Flashcards →"}
        </button>
      )}
    </div>
  );
}

// The schedule, made visible. A student who can see the ladder understands
// why a question they answered last week has gone quiet.
function Ladder({ shape }: { shape: ReturnType<typeof reviewShape> }) {
  const most = Math.max(1, ...shape.boxes);
  return (
    <div className="lms-ladder" aria-label="Your review schedule">
      {shape.boxes.map((n, i) => (
        <div key={i} className={`lms-ladder-step${n > 0 ? " has-any" : ""}`}>
          {/* The bar needs a track to be a percentage of; a percentage
              height inside a content-sized box has nothing to measure. */}
          <span className="lms-ladder-track">
            <span className="lms-ladder-bar" style={{ height: `${Math.round((n / most) * 100)}%` }} />
          </span>
          <span className="lms-ladder-n">{n}</span>
          <span className="lms-ladder-label">{BOX_LABEL[i]}</span>
          <span className="lms-ladder-days">{BOX_DAYS[i]}d</span>
        </div>
      ))}
    </div>
  );
}

export default function StudyHall() {
  const lms = useLms();
  const { state, loaded } = lms;
  const [phase, setPhase] = useState<"makeup" | "cards" | "done">("makeup");
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Session snapshot: answers during the session update the store, but the
  // list itself stays put until the next visit.
  //
  // Keyed on how much history exists rather than on `loaded` alone. For a
  // signed-in student `loaded` flips on the local read, before the server
  // blob lands, and a list snapshotted at that moment is empty forever. The
  // counts change when hydration arrives and hold still while you answer,
  // because answering rewrites entries it does not add them.
  const trackedCount = Object.keys(state.mastery).length;
  const doneCount = Object.values(state.done).reduce((a, b) => a + b.length, 0);
  const due = useMemo<DueQuestion[]>(() => {
    // Longest overdue first (dueQuestions sorts), THEN shuffle for
    // presentation. Slicing after a shuffle could drop the very questions
    // nearest to being forgotten.
    const owed = dueQuestions(state.mastery).slice(0, MAKEUP_SESSION_SIZE);
    return shuffled(owed, seedFrom(`${state.reviewLast}|${owed.length}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, trackedCount, doneCount]);

  // The shape of the ladder, for the header and the nothing-due state.
  const shape = useMemo(() => reviewShape(state.mastery), [state.mastery]);
  const nextDay = useMemo(() => nextDueDay(state.mastery), [state.mastery]);

  // Flashcards from completed units, weakest knowledge checks first
  // (adaptive review: what you missed comes back sooner).
  const pool = useMemo<ReviewCard[]>(() => {
    const seed = seedFrom(`${state.reviewLast}|${state.xp}`);
    const groups: { weakness: number; cards: ReviewCard[] }[] = [];
    for (const course of COURSES) {
      const done = state.done[course.slug] ?? [];
      for (const unit of courseUnits(course)) {
        const lesson = course.lessons[unit.slug];
        if (!lesson || !done.includes(unit.slug)) continue;
        const best = state.quizBest[`${course.slug}/${unit.slug}`] ?? -1;
        const weakness = best < 0 ? 1.25 : 1 - best / lesson.quiz.length;
        groups.push({
          weakness,
          cards: shuffled(
            lesson.cards.map((c) => ({ ...c, source: unit.title })),
            seed + best
          ),
        });
      }
    }
    groups.sort((a, b) => b.weakness - a.weakness);
    return groups.flatMap((g) => g.cards).slice(0, SESSION_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, trackedCount, doneCount]);

  if (!loaded) return <div className="learn" />;

  const inMakeup = phase === "makeup" && due.length > 0;
  const activePhase = inMakeup ? "makeup" : phase === "done" ? "done" : "cards";

  if (pool.length === 0 && due.length === 0) {
    // Two different quiets: nothing learned yet, or everything learned and
    // nothing owed today. The second one deserves to be told, not hidden.
    const caughtUp = shape.tracked > 0;
    return (
      <div className="learn">
        <div className="learn-wrap lms-gate">
          <Link href="/learn" className="crumb">
            ← My Learning
          </Link>
          <p className="kicker kicker--vio">Study Hall</p>
          <h1 className="learn-h1">{caughtUp ? "All caught up." : "Nothing to review yet."}</h1>
          <p className="learn-sub">
            {caughtUp ? (
              <>
                Nothing is due today. {shape.tracked} question
                {shape.tracked === 1 ? " is" : "s are"} on the schedule, and the next one comes back{" "}
                {nextDay === localDay(1) ? "tomorrow" : nextDay ? usDate(nextDay) : "soon"}. Coming
                back on the day it is due is the whole trick; cramming it early teaches you less.
              </>
            ) : (
              <>
                Study Hall brings questions back on a schedule, just before you would have forgotten
                them, and deals flashcards from every unit you have finished. Finish your first unit
                and the stack starts building.
              </>
            )}
          </p>
          {caughtUp && <Ladder shape={shape} />}
          <Link href="/learn" className="btn btn--solid">
            Back to Class →
          </Link>
        </div>
      </div>
    );
  }

  const card = pool[Math.min(i, Math.max(0, pool.length - 1))];

  return (
    <div className="learn">
      <CommandK />
      <RewardToast reward={lms.reward} onDone={lms.clearReward} />
      <div className="learn-wrap lms-gate">
        <Link href="/learn" className="crumb">
          ← My Learning
        </Link>
        <p className="kicker kicker--vio">Study Hall</p>
        <h1 className="learn-h1">
          {activePhase === "done"
            ? "Session done."
            : activePhase === "makeup"
              ? "Due today."
              : "Quick review."}
        </h1>
        <p className="learn-sub">
          {activePhase === "done"
            ? "That's how knowledge sticks: short visits, repeated. Come back tomorrow for fresh XP."
            : activePhase === "makeup"
              ? `${due.length} question${due.length === 1 ? "" : "s"} the schedule says you are about to forget. Get one right and it waits longer before it comes back; get it wrong and it returns tomorrow.`
              : pool.length > 0
                ? `${pool.length} cards from the units you've completed, shuffled. Tap to flip.`
                : "No flashcards yet. Finish a unit to start the stack."}
        </p>

        {activePhase !== "done" && shape.tracked > 0 && <Ladder shape={shape} />}

        {activePhase === "makeup" && (
          <MakeupTest
            due={due}
            onDone={() => {
              if (pool.length > 0) {
                setPhase("cards");
              } else {
                setPhase("done");
                lms.reviewDone();
              }
            }}
          />
        )}

        {activePhase === "done" && (
          <div className="learn-ctas">
            <button
              className="btn btn--solid lms-login-btn"
              onClick={() => {
                setI(0);
                setFlipped(false);
                setPhase(due.length > 0 ? "makeup" : "cards");
              }}
            >
              One More Round
            </button>
            <Link href="/learn" className="btn btn--outline">
              Back to Class
            </Link>
          </div>
        )}

        {activePhase === "cards" && pool.length > 0 && (
          <div className="lms-deck lms-review-deck">
            <div className="lms-quiz-head">
              <span className="lms-quiz-progress">
                Card {i + 1} of {pool.length}
              </span>
              <span className="lms-quiz-best">{card.source}</span>
            </div>
            <button
              className={`lms-card3d${flipped ? " is-flipped" : ""}`}
              onClick={() => setFlipped((f) => !f)}
              aria-label={flipped ? "Show front of card" : "Show back of card"}
            >
              <span className="lms-card3d-inner">
                <span className="lms-card3d-face lms-card3d-front">
                  <span className="lms-card3d-hint">tap to flip</span>
                  {card.front}
                </span>
                <span className="lms-card3d-face lms-card3d-back">{card.back}</span>
              </span>
            </button>
            <div className="lms-deck-nav">
              <button
                className="btn btn--outline lms-deck-btn"
                disabled={i === 0}
                onClick={() => {
                  setI(i - 1);
                  setFlipped(false);
                }}
              >
                ← Back
              </button>
              <button
                className="btn btn--solid lms-deck-btn"
                onClick={() => {
                  if (i + 1 < pool.length) {
                    setI(i + 1);
                    setFlipped(false);
                  } else {
                    setPhase("done");
                    lms.reviewDone();
                  }
                }}
              >
                {i + 1 < pool.length ? "Next Card →" : "Finish Session"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
