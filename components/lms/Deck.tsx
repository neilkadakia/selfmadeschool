"use client";

// Flashcard deck: tap to flip, work through the stack once to finish it.

import { useState } from "react";
import type { Flashcard } from "@/lib/lms";

export default function Deck({
  cards,
  done,
  onComplete,
}: {
  cards: Flashcard[];
  done: boolean;
  onComplete: () => void;
}) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [finished, setFinished] = useState(false);

  const total = cards.length;

  if (finished) {
    return (
      <div className="lms-deck">
        <div className="lms-deck-finish">
          <p className="lms-quiz-score">{total}/{total}</p>
          <p className="lms-quiz-verdict">Deck finished. These come back to you when you need them.</p>
          <button
            className="btn btn--outline lms-quiz-btn"
            onClick={() => {
              setI(0);
              setFlipped(false);
              setFinished(false);
            }}
          >
            Go Through Again
          </button>
        </div>
      </div>
    );
  }

  const card = cards[i];

  return (
    <div className="lms-deck">
      <div className="lms-quiz-head">
        <span className="lms-quiz-progress">
          Card {i + 1} of {total}
        </span>
        {done && <span className="lms-quiz-best">Deck done ✓</span>}
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
            if (i + 1 < total) {
              setI(i + 1);
              setFlipped(false);
            } else {
              setFinished(true);
              onComplete();
            }
          }}
        >
          {i + 1 < total ? "Next Card →" : "Finish Deck"}
        </button>
      </div>
    </div>
  );
}
