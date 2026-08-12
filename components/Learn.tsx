"use client";

import Link from "next/link";
import { ALL_UNITS, PARTS } from "@/lib/curriculum";
import { useProgress } from "./useProgress";

export default function Learn() {
  const { done, loaded } = useProgress();

  const total = ALL_UNITS.length;
  const doneCount = ALL_UNITS.filter((u) => done.includes(u.slug)).length;
  const nextUnit = ALL_UNITS.find((u) => !done.includes(u.slug)) ?? ALL_UNITS[0];

  return (
    <div className="learn">
      <div className="learn-wrap">
        <header className="learn-head">
          <p className="kicker kicker--acc">The 13th Grade — Class of &apos;26</p>
          <h1 className="learn-h1">Class is in session.</h1>
          <p className="learn-sub">
            24 units across three parts. Read the chapter, watch the module, do the thing. Your
            progress saves on this device — no account, no pop quizzes.
          </p>
          <div className="learn-progress" aria-label={`${doneCount} of ${total} units complete`}>
            <div className="learn-bar">
              {PARTS.map((part) => {
                const partDone = part.units.filter((u) => done.includes(u.slug)).length;
                return (
                  <span
                    key={part.id}
                    className={`learn-bar-seg seg--${part.tone}`}
                    style={{ width: `${(partDone / total) * 100}%` }}
                  />
                );
              })}
            </div>
            <span className="learn-count">
              {loaded ? `${doneCount}/${total}` : `0/${total}`}
            </span>
          </div>
          <div className="learn-ctas">
            <Link href={`/learn/${nextUnit.slug}`} className="btn btn--solid">
              {doneCount === 0 ? "Start Unit 01 →" : doneCount === total ? "Review the Course →" : "Continue →"}
            </Link>
            <Link href="/#book" className="btn btn--outline">
              Get the Book
            </Link>
          </div>
        </header>

        {PARTS.map((part, pi) => {
          const partDone = part.units.filter((u) => done.includes(u.slug)).length;
          return (
            <section key={part.id} className="learn-part">
              <div className="learn-part-head">
                <div>
                  <p className={`learn-part-kicker tone-${part.tone}`}>
                    Part {["I", "II", "III"][pi]}
                  </p>
                  <h2 className="learn-part-name">{part.name}</h2>
                  <p className="learn-part-tag">{part.tagline}</p>
                </div>
                <span className="learn-part-count">{partDone}/8</span>
              </div>
              <div className="unit-rows">
                {part.units.map((u, i) => {
                  const n = pi * 8 + i + 1;
                  const isDone = done.includes(u.slug);
                  return (
                    <Link key={u.slug} href={`/learn/${u.slug}`} className="unit-row">
                      <span className="unit-row-num">{String(n).padStart(2, "0")}</span>
                      <span className="unit-row-main">
                        <span className="unit-row-title">{u.title}</span>
                        <span className="unit-row-blurb">{u.blurb}</span>
                      </span>
                      <span
                        className={
                          isDone ? "pill pill--acc" : u.live ? `pill row-pill--${part.tone}` : "pill row-pill--dim"
                        }
                      >
                        {isDone ? "Done ✓" : u.live ? "10-min module" : "Chapter first"}
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
