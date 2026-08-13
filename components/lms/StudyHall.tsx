"use client";

// Study Hall — review flashcards drawn from every unit you've completed,
// across all courses. One shuffled stack per visit, XP once per day.

import Link from "next/link";
import { useMemo, useState } from "react";
import { COURSES, courseUnits } from "@/lib/lms";
import { seedFrom, shuffled } from "@/lib/shuffle";
import { useLms } from "@/components/useLms";
import CommandK from "./CommandK";
import RewardToast from "./RewardToast";

const SESSION_SIZE = 20;

type ReviewCard = { front: string; back: string; source: string };

export default function StudyHall() {
  const lms = useLms();
  const { state, loaded } = lms;
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [finished, setFinished] = useState(false);

  // All flashcards from completed units that have lessons.
  const pool = useMemo<ReviewCard[]>(() => {
    const cards: ReviewCard[] = [];
    for (const course of COURSES) {
      const done = state.done[course.slug] ?? [];
      for (const unit of courseUnits(course)) {
        const lesson = course.lessons[unit.slug];
        if (!lesson || !done.includes(unit.slug)) continue;
        for (const c of lesson.cards) {
          cards.push({ ...c, source: unit.title });
        }
      }
    }
    // Order varies session to session via a seed built from progress state.
    const seed = seedFrom(`${state.reviewLast}|${state.xp}|${cards.length}`);
    return shuffled(cards, seed).slice(0, SESSION_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  if (!loaded) return <div className="learn" />;

  if (pool.length === 0) {
    return (
      <div className="learn">
        <div className="learn-wrap lms-gate">
          <Link href="/learn" className="crumb">
            ← My Learning
          </Link>
          <p className="kicker kicker--vio">Study Hall</p>
          <h1 className="learn-h1">Nothing to review yet.</h1>
          <p className="learn-sub">
            Study Hall pulls flashcards from every unit you&apos;ve completed. Finish your first
            unit and the stack starts building.
          </p>
          <Link href="/learn" className="btn btn--solid">
            Back to Class →
          </Link>
        </div>
      </div>
    );
  }

  const card = pool[i];

  return (
    <div className="learn">
      <CommandK />
      <RewardToast reward={lms.reward} onDone={lms.clearReward} />
      <div className="learn-wrap lms-gate">
        <Link href="/learn" className="crumb">
          ← My Learning
        </Link>
        <p className="kicker kicker--vio">Study Hall</p>
        <h1 className="learn-h1">{finished ? "Session done." : "Quick review."}</h1>
        <p className="learn-sub">
          {finished
            ? "That's how knowledge sticks — short visits, repeated. Come back tomorrow for fresh XP."
            : `${pool.length} cards from the units you've completed, shuffled. Tap to flip.`}
        </p>

        {finished ? (
          <div className="learn-ctas">
            <button
              className="btn btn--solid lms-login-btn"
              onClick={() => {
                setI(0);
                setFlipped(false);
                setFinished(false);
              }}
            >
              One More Round
            </button>
            <Link href="/learn" className="btn btn--outline">
              Back to Class
            </Link>
          </div>
        ) : (
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
                    setFinished(true);
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
