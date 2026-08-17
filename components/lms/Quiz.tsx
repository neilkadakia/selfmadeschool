"use client";

// Knowledge check: one question at a time, instant feedback, retake forever.

import { useMemo, useState } from "react";
import type { QuizQuestion } from "@/lib/lms";
import { seedFrom, shuffledOptions } from "@/lib/shuffle";

export default function Quiz({
  questions,
  best,
  onComplete,
  onAnswer,
}: {
  questions: QuizQuestion[];
  best: number | undefined;
  onComplete: (correct: number, total: number) => void;
  onAnswer?: (index: number, correct: boolean) => void;
}) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  // Bumped on every retake, so a second run moves the options and you cannot
  // pass on remembering that it was the third one.
  const [attempt, setAttempt] = useState(0);

  const total = questions.length;

  // Options move; the question does not. Seeded by the question text so the
  // order holds still while you are looking at it.
  const shown = useMemo(
    () =>
      questions.map((q) => {
        const s = shuffledOptions(q.options, q.answer, seedFrom(`${q.q}|${attempt}`));
        return { ...q, options: s.options, answer: s.answer };
      }),
    [questions, attempt]
  );

  const q = shown[i];

  const restart = () => {
    setI(0);
    setPicked(null);
    setCorrectCount(0);
    setFinished(false);
    setAttempt((n) => n + 1);
  };

  if (finished) {
    const perfect = correctCount === total;
    return (
      <div className="lms-quiz">
        <div className="lms-quiz-result">
          <p className="lms-quiz-score">
            {correctCount}/{total}
          </p>
          <p className="lms-quiz-verdict">
            {perfect
              ? "Perfect. That's the whole unit, locked in."
              : correctCount >= total - 1
                ? "So close. Check the one you missed and run it back, it'll stick this time."
                : "Missing a few is how this is supposed to go. The explanations above are the actual lesson: read them once, take it again, and watch the number move."}
          </p>
          <button className="btn btn--outline lms-quiz-btn" onClick={restart}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lms-quiz">
      <div className="lms-quiz-head">
        <span className="lms-quiz-progress">
          Question {i + 1} of {total}
        </span>
        {typeof best === "number" && best >= 0 && (
          <span className="lms-quiz-best">
            Best: {best}/{total}
          </span>
        )}
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
                if (oi === q.answer) setCorrectCount((c) => c + 1);
                onAnswer?.(i, oi === q.answer);
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
          <strong>{picked === q.answer ? "Right." : "Not quite, and that's fine."}</strong>{" "}
          {q.explain}
        </div>
      )}
      {picked !== null && (
        <button
          className="btn btn--solid lms-quiz-btn"
          onClick={() => {
            if (i + 1 < total) {
              setI(i + 1);
              setPicked(null);
            } else {
              const finalCorrect = correctCount;
              setFinished(true);
              onComplete(finalCorrect, total);
            }
          }}
        >
          {i + 1 < total ? "Next Question →" : "See My Score"}
        </button>
      )}
    </div>
  );
}
