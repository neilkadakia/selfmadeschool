"use client";

// The Final — 12 questions drawn from across the course, unlocked at 100%
// units complete. The exam runs in the browser, but the answer sheet is
// graded by the Registrar (finals.php) and the passing record lives
// server-side — that record is what "With Honors" and the Diploma rest on.

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { COURSES, courseUnits, getCourse, FINAL_QUESTIONS, FINAL_PASS, type QuizQuestion } from "@/lib/lms";
import { questionKey } from "@/lib/mastery";
import { apiFinalSubmit } from "@/lib/api";
import { seedFrom, shuffled } from "@/lib/shuffle";
import { useLms, courseProgress } from "@/components/useLms";
import FeedbackCard from "./FeedbackCard";
import RewardToast from "./RewardToast";

type ExamQ = QuizQuestion & { source: string; key: string };
type Pick = { k: string; a: number };

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
  const [sheet, setSheet] = useState<Pick[]>([]);
  const [handedIn, setHandedIn] = useState(false);
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState("");
  const [result, setResult] = useState<{ score: number; total: number; passed: boolean } | null>(
    null
  );

  const exam = useMemo<ExamQ[]>(() => {
    if (!course) return [];
    const all: ExamQ[] = [];
    for (const unit of courseUnits(course)) {
      const lesson = course.lessons[unit.slug];
      if (!lesson) continue;
      lesson.quiz.forEach((q, qi) =>
        all.push({ ...q, source: unit.title, key: questionKey(course.slug, unit.slug, qi) })
      );
    }
    // A new order every attempt: the seed folds in the attempt counter and XP.
    const seed = seedFrom(`${courseSlug}|${attempt}|${state.xp}`);
    return shuffled(all, seed).slice(0, FINAL_QUESTIONS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseSlug, attempt]);

  // Hand the sheet to the Registrar; the certificate's record is the
  // server's answer, not the browser's tally.
  const submitSheet = async (finalSheet: Pick[]) => {
    setHandedIn(true);
    setGrading(true);
    setGradeError("");
    const res = await apiFinalSubmit(lms.auth?.token ?? "", courseSlug, finalSheet);
    setGrading(false);
    if (res.ok) {
      const score = res.data.score as number;
      const total = res.data.total as number;
      setResult({ score, total, passed: res.data.passed as boolean });
      lms.finalResult(courseSlug, score, total);
    } else {
      setGradeError(
        (res.data.error as string) ??
          "The Registrar can't be reached — your answers are safe. Check your connection and submit again."
      );
    }
  };

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

  const retake = () => {
    setStarted(true);
    setAttempt((a) => a + 1);
    setI(0);
    setPicked(null);
    setSheet([]);
    setHandedIn(false);
    setResult(null);
    setGradeError("");
  };

  // The sheet is in — waiting on the Registrar, or holding it after a miss.
  if (started && handedIn && !result) {
    return (
      <div className="learn">
        <div className="learn-wrap lms-gate">
          <p className={`kicker kicker--${course.tone}`}>The Final — {course.title}</p>
          <h1 className="learn-h1">{grading ? "Grading…" : "Held at the desk."}</h1>
          <p className="learn-sub">
            {grading
              ? "Your answer sheet is with the Registrar."
              : gradeError || "Your answers are safe — submit when you're back online."}
          </p>
          {!grading && (
            <button className="btn btn--solid lms-login-btn" onClick={() => void submitSheet(sheet)}>
              Submit to the Registrar
            </button>
          )}
        </div>
      </div>
    );
  }

  if (result || (!started && record)) {
    const score = result ? result.score : record!.score;
    const total = result ? result.total : record!.total;
    const passed = result ? result.passed || Boolean(record?.passed) : record!.passed;
    const allFinalsPassed = COURSES.every((c) => state.finals[c.slug]?.passed);
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
              ? "Ten or better, graded and recorded by the Registrar. Your certificate carries it — permanently."
              : `${FINAL_PASS} of ${total} passes. The questions rotate every attempt, and there's no limit — that's how real learning works.`}
          </p>
          <div className="learn-ctas">
            {passed ? (
              <>
                {allFinalsPassed && (
                  <Link href="/learn/certificate/?course=diploma" className="btn btn--solid">
                    See Your Diploma →
                  </Link>
                )}
                <Link
                  href={`/learn/certificate/?course=${course.slug}`}
                  className={allFinalsPassed ? "btn btn--outline lms-login-btn" : "btn btn--solid"}
                >
                  See Your Certificate →
                </Link>
              </>
            ) : (
              <button className="btn btn--solid lms-login-btn" onClick={retake}>
                Retake the Final
              </button>
            )}
            {passed && (
              <button className="btn btn--outline lms-login-btn" onClick={retake}>
                Beat Your Score
              </button>
            )}
          </div>
          {passed && result && (
            <FeedbackCard
              totalDone={progress.done}
              context={`Graduated · ${course.title}`}
              prompt="You just passed the Final — what would you tell a friend about this course?"
            />
          )}
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
            time limit, no trick questions, retakes forever. Graded and recorded by the school,
            so you&apos;ll need a connection when you hand it in.
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
                    setSheet((prev) => [...prev, { k: q.key, a: oi }]);
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
                  void submitSheet(sheet);
                }
              }}
            >
              {i + 1 < exam.length ? "Next Question →" : "Hand It In"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
