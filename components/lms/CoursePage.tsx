"use client";

import Link from "next/link";
import { getCourse, courseUnits } from "@/lib/lms";
import { useLms, courseProgress } from "@/components/useLms";
import { useCourseOpen } from "./useSchool";
import CommandK from "./CommandK";
import CourseLock from "./CourseLock";
import RewardToast from "./RewardToast";
import SaveOffline from "./SaveOffline";

export default function CoursePage({ slug }: { slug: string }) {
  const lms = useLms();
  const { state, loaded } = lms;
  const gate = useCourseOpen(slug);
  const course = getCourse(slug);
  if (!course) return null;

  // While the school is free this is always open, so nothing is gated by
  // accident on a slow network: the lock waits until the server has said
  // that payment is on and this course is not covered.
  if (gate.known && !gate.open) return <CourseLock slug={slug} needs={gate.needs} after={gate.after} />;

  const done = state.done[course.slug] ?? [];
  const p = courseProgress(state, course.slug);
  const units = courseUnits(course);
  const nextUnit = units.find((u) => !done.includes(u.slug)) ?? units[0];
  const romans = ["I", "II", "III", "IV"];

  return (
    <div className="learn">
      <CommandK />
      <RewardToast reward={lms.reward} onDone={lms.clearReward} />
      <div className="learn-wrap">
        <header className="learn-head">
          <Link href="/learn" className="crumb">
            ← My Learning
          </Link>
          <p className={`kicker kicker--${course.tone}`}>
            {course.kicker}
            {course.status === "preview" ? " · Demo Preview" : ""}
          </p>
          <h1 className="learn-h1">{course.title}</h1>
          <p className="learn-sub">{course.description}</p>

          <div className="learn-progress" aria-label={`${p.done} of ${p.total} units complete`}>
            <div className="learn-bar">
              {course.parts.map((part) => {
                const partDone = part.units.filter((u) => done.includes(u.slug)).length;
                return (
                  <span
                    key={part.id}
                    className={`learn-bar-seg seg--${part.tone}`}
                    style={{ width: `${(partDone / p.total) * 100}%` }}
                  />
                );
              })}
            </div>
            <span className="learn-count">{loaded ? `${p.done}/${p.total}` : `0/${p.total}`}</span>
          </div>

          <div className="learn-ctas">
            <Link href={`/learn/${course.slug}/${nextUnit.slug}`} className="btn btn--solid">
              {p.done === 0 ? "Start Unit 01 →" : p.pct === 100 ? "Review the Course →" : "Continue →"}
            </Link>
            {p.pct === 100 ? (
              <>
                <Link href={`/learn/final/?course=${course.slug}`} className="btn btn--outline">
                  {state.finals[course.slug]?.passed ? "Final Passed ✓" : "Take the Final"}
                </Link>
                <Link href={`/learn/certificate/?course=${course.slug}`} className="btn btn--outline">
                  Get Your Certificate
                </Link>
              </>
            ) : (
              <Link href="/#book" className="btn btn--outline">
                Get the Book
              </Link>
            )}
          </div>

          <SaveOffline course={course} />
        </header>

        {course.parts.map((part, pi) => {
          const partDone = part.units.filter((u) => done.includes(u.slug)).length;
          let offset = 0;
          for (let i = 0; i < pi; i++) offset += course.parts[i].units.length;
          return (
            <section key={part.id} className="learn-part">
              <div className="learn-part-head">
                <div>
                  <p className={`learn-part-kicker tone-${part.tone}`}>Part {romans[pi]}</p>
                  <h2 className="learn-part-name">{part.name}</h2>
                  <p className="learn-part-tag">{part.tagline}</p>
                </div>
                <span className="learn-part-count">
                  {partDone}/{part.units.length}
                </span>
              </div>
              <div className="unit-rows">
                {part.units.map((u, i) => {
                  const n = offset + i + 1;
                  const isDone = done.includes(u.slug);
                  const hasLesson = Boolean(course.lessons[u.slug]);
                  return (
                    <Link key={u.slug} href={`/learn/${course.slug}/${u.slug}`} className="unit-row">
                      <span className="unit-row-num">{String(n).padStart(2, "0")}</span>
                      <span className="unit-row-main">
                        <span className="unit-row-title">{u.title}</span>
                        <span className="unit-row-blurb">{u.blurb}</span>
                      </span>
                      <span
                        className={
                          isDone
                            ? "pill pill--acc"
                            : hasLesson || u.live
                              ? `pill row-pill--${part.tone}`
                              : "pill row-pill--dim"
                        }
                      >
                        {isDone
                          ? "Done ✓"
                          : hasLesson && u.live
                            ? "Lesson + video"
                            : hasLesson
                              ? "Full lesson"
                              : u.live
                                ? "Video lesson"
                                : "Chapter first"}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
