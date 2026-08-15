"use client";

// Knowledge check: one question at a time, instant feedback, retake forever.

import { useState } from "react";
import type { QuizQuestion } from "@/lib/lms";

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

  const q = questions[i];
  const total = questions.length;

  const restart = () => {
    setI(0);
    setPicked(null);
    setCorrectCount(0);
    setFinished(false);
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
                ? "Almost perfect. Check the one you missed and run it back."
                : "Good attempt. The explanations above are the actual lesson, worth a reread."}
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
          <strong>{picked === q.answer ? "Right." : "Not quite."}</strong> {q.explain}
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
