"use client";

// The Final — 12 questions drawn from across the course, unlocked at 100%
// units complete. Pass with 10+ and the certificate gains "With Honors."

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { COURSES, courseUnits, getCourse, FINAL_QUESTIONS, FINAL_PASS, type QuizQuestion } from "@/lib/lms";
import { seedFrom, shuffled } from "@/lib/shuffle";
import { useLms, courseProgress } from "@/components/useLms";
import RewardToast from "./RewardToast";

type ExamQ = QuizQuestion & { source: string };

export default function FinalExam() {
  const lms = useLms();
  const { state, loaded } = lms;
  const params = useSearchParams();
  const courseSlug = params.get("course") ?? COURSES[0].slug;
  const course = getCourse(courseSlug);

  const [started, setStarted] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);

  const exam = useMemo<ExamQ[]>(() => {
    if (!course) return [];
    const all: ExamQ[] = [];
    for (const unit of courseUnits(course)) {
      const lesson = course.lessons[unit.slug];
      if (!lesson) continue;
      for (const q of lesson.quiz) all.push({ ...q, source: unit.title });
    }
    // A new order every attempt: the seed folds in the attempt counter and XP.
    const seed = seedFrom(`${courseSlug}|${attempt}|${state.xp}`);
    return shuffled(all, seed).slice(0, FINAL_QUESTIONS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseSlug, attempt]);

  if (!loaded || !course) return <div className="learn" />;

  const progress = courseProgress(state, course.slug);
  const unlocked = progress.pct === 100;
  const record = state.finals[course.slug];

  if (!unlocked) {
    return (
      <div className="learn">
        <div className="learn-wrap lms-gate">
          <Link href={`/learn/${course.slug}`} className="crumb">
            ← {course.title}
          </Link>
          <p className={`kicker kicker--${course.tone}`}>The Final</p>
          <h1 className="learn-h1">Not yet.</h1>
          <p className="learn-sub">
            The Final unlocks when all {progress.total} units are complete — you&apos;re at{" "}
            {progress.done}. No cramming shortcuts here; that&apos;s the point.
          </p>
          <Link href={`/learn/${course.slug}`} className="btn btn--solid">
            Back to the Course →
          </Link>
        </div>
      </div>
    );
  }

  if (finished || (!started && record)) {
    const score = finished ? correct : record!.score;
    const total = FINAL_QUESTIONS;
    const passed = finished ? correct >= FINAL_PASS : record!.passed;
    return (
      <div className="learn">
        <RewardToast reward={lms.reward} onDone={lms.clearReward} />
        <div className="learn-wrap lms-gate">
          <Link href={`/learn/${course.slug}`} className="crumb">
            ← {course.title}
          </Link>
          <p className={`kicker kicker--${course.tone}`}>The Final — {course.title}</p>
          <h1 className="learn-h1">{passed ? "With Honors." : "Close."}</h1>
          <p className="lms-quiz-score lms-final-score">
            {score}/{total}
          </p>
          <p className="learn-sub">
            {passed
              ? "Ten or better. Your certificate now carries it — permanently."
              : `${FINAL_PASS} of ${total} passes. The questions rotate every attempt, and there's no limit — that's how real learning works.`}
          </p>
          <div className="learn-ctas">
            {passed ? (
              <Link href={`/learn/certificate/?course=${course.slug}`} className="btn btn--solid">
                See Your Certificate →
              </Link>
            ) : (
              <button
                className="btn btn--solid lms-login-btn"
                onClick={() => {
                  setStarted(true);
                  setAttempt((a) => a + 1);
                  setFinished(false);
                  setI(0);
                  setPicked(null);
                  setCorrect(0);
                }}
              >
                Retake the Final
              </button>
            )}
            {passed && (
              <button
                className="btn btn--outline lms-login-btn"
                onClick={() => {
                  setStarted(true);
                  setAttempt((a) => a + 1);
                  setFinished(false);
                  setI(0);
                  setPicked(null);
                  setCorrect(0);
                }}
              >
                Beat Your Score
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="learn">
        <div className="learn-wrap lms-gate">
          <Link href={`/learn/${course.slug}`} className="crumb">
            ← {course.title}
          </Link>
          <p className={`kicker kicker--${course.tone}`}>The Final — {course.title}</p>
          <h1 className="learn-h1">Twelve questions. One course.</h1>
          <p className="learn-sub">
            Drawn from every unit you just finished, shuffled fresh each attempt. Score{" "}
            {FINAL_PASS} or better and your certificate reads <strong>With Honors</strong> — no
            time limit, no trick questions, retakes forever.
          </p>
          <button className="btn btn--solid lms-login-btn" onClick={() => setStarted(true)}>
            Begin the Final
          </button>
        </div>
      </div>
    );
  }

  const q = exam[i];

  return (
    <div className="learn">
      <RewardToast reward={lms.reward} onDone={lms.clearReward} />
      <div className="learn-wrap lms-gate">
        <p className={`kicker kicker--${course.tone}`}>The Final — {course.title}</p>
        <div className="lms-quiz lms-final">
          <div className="lms-quiz-head">
            <span className="lms-quiz-progress">
              Question {i + 1} of {exam.length}
            </span>
            <span className="lms-quiz-best">{q.source}</span>
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
                    if (oi === q.answer) setCorrect((c) => c + 1);
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
                if (i + 1 < exam.length) {
                  setI(i + 1);
                  setPicked(null);
                } else {
                  setFinished(true);
                  lms.finalResult(course.slug, correct, exam.length);
                }
              }}
            >
              {i + 1 < exam.length ? "Next Question →" : "Finish the Final"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
