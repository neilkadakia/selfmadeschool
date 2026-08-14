"use client";

import Link from "next/link";
import { BADGES, COURSES, levelFor, courseUnits } from "@/lib/lms";
import { allBosses } from "@/lib/game";
import { dueQuestions } from "@/lib/mastery";
import { profileComplete } from "@/lib/api";
import { useLms, courseProgress } from "@/components/useLms";
import AvatarStudio from "./AvatarStudio";
import EnrollmentCard from "./EnrollmentCard";
import Bulletin from "./Bulletin";
import CommandK from "./CommandK";
import FeedbackCard from "./FeedbackCard";
import HonorRoll from "./HonorRoll";
import RewardToast from "./RewardToast";
import Ring from "./Ring";
import TodayPlan from "./TodayPlan";

function Flame({ lit }: { lit: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`lms-flame${lit ? " is-lit" : ""}`} aria-hidden="true">
      <path
        d="M12 2c.5 3.5-1.8 5.2-3.2 7C7.3 10.9 6 12.7 6 15a6 6 0 0 0 12 0c0-2.6-1.3-4.3-2.4-5.8C14.3 7.4 13.4 5.6 14 3c-1 .4-1.8 1.4-2 2.5C11.8 4.3 11.7 3 12 2z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function LearnHome() {
  const lms = useLms();
  const { state, loaded } = lms;
  const level = levelFor(state.xp);

  const totalDone = Object.values(state.done).reduce((a, b) => a + b.length, 0);

  // Front Office comes first: class starts once the school can reach you.
  if (loaded && lms.auth && !profileComplete(lms.auth)) {
    return (
      <div className="learn">
        <RewardToast reward={lms.reward} onDone={lms.clearReward} />
        <div className="learn-wrap lms-gate">
          <p className="kicker kicker--acc">Front Office</p>
          <h1 className="learn-h1">First, your enrollment card.</h1>
          <p className="learn-sub">
            Every student files one — your name as it should read on your certificate,
            and a phone number so the school can reach you. Thirty seconds, once.
          </p>
          <EnrollmentCard />
        </div>
      </div>
    );
  }

  // Picture Day comes before the dashboard: no portrait, no desk.
  if (loaded && lms.auth && !state.avatar.created) {
    return (
      <div className="learn">
        <RewardToast reward={lms.reward} onDone={lms.clearReward} />
        <div className="learn-wrap">
          <p className="kicker kicker--acc">Picture Day</p>
          <h1 className="learn-h1">First, the portrait.</h1>
          <p className="learn-sub">
            Every student gets one. Build yours — it fights beside you in the Arena, wears
            whatever you buy in the Locker, and can be retaken anytime.
          </p>
          <AvatarStudio firstRun />
        </div>
      </div>
    );
  }

  // Boss card: the first fully-finished part whose monster is undefeated.
  const bossReady = allBosses().find((b) => {
    const done = state.done[b.course.slug] ?? [];
    return (
      b.part.units.length > 0 &&
      b.part.units.every((u) => done.includes(u.slug)) &&
      !state.battles[b.key]?.won
    );
  });

  // Next up: a course you've started but not finished, else the first unfinished course.
  const inProgress = COURSES.find((c) => {
    const p = courseProgress(state, c.slug);
    return p.done > 0 && p.done < p.total;
  });
  const nextCourse =
    inProgress ?? COURSES.find((c) => courseProgress(state, c.slug).pct < 100) ?? COURSES[0];
  const nextUnit =
    courseUnits(nextCourse).find((u) => !(state.done[nextCourse.slug] ?? []).includes(u.slug)) ??
    courseUnits(nextCourse)[0];

  // Sharpen: the completed unit with the weakest (or missing) knowledge check.
  let sharpen: { course: string; slug: string; title: string; best: number } | null = null;
  let weakest = 1;
  for (const course of COURSES) {
    const done = state.done[course.slug] ?? [];
    for (const u of courseUnits(course)) {
      const lesson = course.lessons[u.slug];
      if (!lesson || !done.includes(u.slug)) continue;
      const best = state.quizBest[`${course.slug}/${u.slug}`] ?? -1;
      if (best >= lesson.quiz.length) continue;
      const ratio = best < 0 ? -0.25 : best / lesson.quiz.length;
      if (ratio < weakest) {
        weakest = ratio;
        sharpen = { course: course.slug, slug: u.slug, title: u.title, best };
      }
    }
  }

  // Last 7 local days for the activity dots.
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const p = (n: number) => String(n).padStart(2, "0");
    return {
      key: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
      label: ["S", "M", "T", "W", "T", "F", "S"][d.getDay()],
    };
  });

  return (
    <div className="learn">
      <CommandK />
      <RewardToast reward={lms.reward} onDone={lms.clearReward} />
      <div className="learn-wrap">
        <header className="learn-head">
          <p className="kicker kicker--acc">My Desk</p>
          <h1 className="learn-h1">Class is in session.</h1>
          <p className="learn-sub">
            Three courses, one rule: read the chapter, watch the module, do the thing. Your progress
            is saved to your account and follows you to any device. No pop quizzes.
          </p>
        </header>

        <div className="learn-cols">
          <div className="learn-colmain">
            <Link href={`/learn/${nextCourse.slug}/${nextUnit.slug}`} className="lms-continue">
              <span className="lms-continue-main">
                <span className={`lms-continue-kicker tone-${nextCourse.tone}`}>
                  {totalDone === 0 ? "Start here" : "Continue"} — {nextCourse.title}
                </span>
                <span className="lms-continue-title">
                  Unit {String(nextUnit.number).padStart(2, "0")} · {nextUnit.title}
                </span>
                <span className="lms-continue-blurb">{nextUnit.blurb}</span>
              </span>
              <span className="lms-continue-arrow" aria-hidden="true">
                →
              </span>
            </Link>

            <Bulletin />

            {totalDone > 0 && (
              <div className="lms-foryou">
                <Link href="/learn/review" className="lms-studyhall">
                  <span className="lms-studyhall-main">
                    <span className="lms-studyhall-title">Study Hall</span>
                    <span className="lms-studyhall-sub">
                      {(() => {
                        const makeup = dueQuestions(state.mastery).length;
                        if (makeup > 0)
                          return `${makeup} make-up question${makeup === 1 ? "" : "s"} in the pile — clear it, then flashcards`;
                        return state.reviewLast === days[6].key
                          ? "Reviewed today ✓ — more never hurts"
                          : "Weak spots first — flashcards from your completed units";
                      })()}
                    </span>
                  </span>
                  <span className="lms-continue-arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
                {bossReady && (
                  <Link
                    href={`/learn/arena/?course=${bossReady.course.slug}&part=${bossReady.partIndex}`}
                    className="lms-studyhall lms-bossready"
                  >
                    <span className="lms-studyhall-main">
                      <span className="lms-studyhall-title">Boss Ready</span>
                      <span className="lms-studyhall-sub">
                        {bossReady.monster.name} guards {bossReady.part.name} — settle it in the
                        Arena
                      </span>
                    </span>
                    <span className="lms-continue-arrow" aria-hidden="true">
                      →
                    </span>
                  </Link>
                )}
                {sharpen && (
                  <Link
                    href={`/learn/${sharpen.course}/${sharpen.slug}#quiz`}
                    className="lms-studyhall lms-sharpen"
                  >
                    <span className="lms-studyhall-main">
                      <span className="lms-studyhall-title">Sharpen</span>
                      <span className="lms-studyhall-sub">
                        {sharpen.best < 0
                          ? `You skipped the knowledge check on ${sharpen.title}`
                          : `${sharpen.title}: best score ${sharpen.best}/4 — run it back`}
                      </span>
                    </span>
                    <span className="lms-continue-arrow" aria-hidden="true">
                      →
                    </span>
                  </Link>
                )}
              </div>
            )}

            <section className="lms-courses" aria-label="Courses">
              {COURSES.map((course) => {
                const p = courseProgress(state, course.slug);
                return (
                  <Link
                    key={course.slug}
                    href={`/learn/${course.slug}`}
                    className={`lms-course tone-border-${course.tone}`}
                  >
                    <div className="lms-course-top">
                      <p className={`lms-course-kicker tone-${course.tone}`}>{course.kicker}</p>
                      <span className="lms-course-top-right">
                        {course.status === "preview" && <span className="pill row-pill--dim">Demo Preview</span>}
                        {p.pct === 100 && <span className="pill pill--acc">Complete ✓</span>}
                        <Ring pct={p.pct} tone={course.tone} />
                      </span>
                    </div>
                    <h2 className="lms-course-title">{course.title}</h2>
                    <p className="lms-course-blurb">{course.headline}</p>
                    <div className="lms-course-foot">
                      <span className="lms-course-bar">
                        <span
                          className={`lms-course-fill fill--${course.tone}`}
                          style={{ width: `${p.pct}%` }}
                        />
                      </span>
                      <span className="lms-course-count">
                        {p.done}/{p.total}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </section>

          </div>

          <aside className="learn-rail" aria-label="Your stats and plan">
            <div className="lms-stats" aria-label="Your learning stats">
              <div className="lms-stat">
                <span className="lms-stat-num">
                  <Flame lit={state.streak.count > 0} />
                  {loaded ? state.streak.count : 0}
                </span>
                <span className="lms-stat-label">day streak</span>
              </div>
              <div className="lms-stat">
                <span className="lms-stat-num">{loaded ? state.xp : 0}</span>
                <span className="lms-stat-label">XP</span>
              </div>
              <div className="lms-stat">
                <span className="lms-stat-num">{loaded ? totalDone : 0}</span>
                <span className="lms-stat-label">units done</span>
              </div>
              <div className="lms-stat">
                <span className="lms-stat-num">{loaded ? state.credits : 0}</span>
                <span className="lms-stat-label">credits</span>
              </div>
              <div className="lms-stat lms-stat--level">
                <span className="lms-stat-num">{level.name}</span>
                <span className="lms-stat-label">
                  {level.next ? `${level.nextAt! - state.xp} XP to ${level.next}` : "top of the class"}
                </span>
                <span className="lms-level-bar">
                  <span className="lms-level-fill" style={{ width: `${level.pct}%` }} />
                </span>
              </div>
              <div className="lms-week" aria-label="Last seven days of activity">
                {days.map((d, i) => (
                  <span key={i} className="lms-day">
                    <span
                      className={`lms-day-dot${state.activity.includes(d.key) ? " is-active" : ""}`}
                    />
                    <span className="lms-day-label">{d.label}</span>
                  </span>
                ))}
              </div>
            </div>

            {loaded && (
              <TodayPlan
                state={state}
                todayKey={days[6].key}
                nextHref={`/learn/${nextCourse.slug}/${nextUnit.slug}`}
                totalDone={totalDone}
              />
            )}

            <HonorRoll />

            <FeedbackCard totalDone={totalDone} />
          </aside>
        </div>

        <section className="lms-badges" aria-label="Badges">
          <h2 className="lms-section-h">Report card</h2>
          <p className="lms-section-sub">
            Badges you earn by showing up. No participation trophies — every one of these means
            something happened.
          </p>
          <div className="lms-badge-grid">
            {BADGES.map((b) => {
              const earned = state.badges.includes(b.id);
              return (
                <div key={b.id} className={`lms-badge${earned ? " is-earned" : ""}`} title={b.blurb}>
                  <span className="lms-badge-icon">{b.icon}</span>
                  <span className="lms-badge-name">{b.name}</span>
                  <span className="lms-badge-blurb">{b.blurb}</span>
                </div>
              );
            })}
          </div>
        </section>

        <p className="lms-hint">
          Tip: press <kbd>Ctrl</kbd>+<kbd>K</kbd> to jump to any unit.
        </p>
      </div>
    </div>
  );
}
