"use client";

import Link from "next/link";
import { ALL_UNITS, getUnit, unitNumber } from "@/lib/curriculum";
import { useProgress } from "./useProgress";

export default function UnitPage({ slug }: { slug: string }) {
  const { done, toggle, loaded } = useProgress();
  const unit = getUnit(slug);
  if (!unit) return null;

  const n = unitNumber(slug);
  const prev = ALL_UNITS[n - 2];
  const next = ALL_UNITS[n];
  const isDone = done.includes(slug);

  return (
    <div className="unit-page">
      <div className="unit-wrap">
        <Link href="/learn" className="crumb">
          ← The 13th Grade
        </Link>
        <p className={`unit-kicker tone-${unit.part.tone}`}>
          {unit.part.name} · Unit {String(n).padStart(2, "0")} of 24
        </p>
        <h1 className="unit-h1">{unit.title}</h1>
        <p className="unit-blurb">{unit.blurb}</p>

        <div className="unit-panels">
          <div className="panel panel--read">
            <p className="panel-kicker">Read</p>
            <h2 className="panel-title">
              Chapter {unit.index + 1} · {unit.part.name}
            </h2>
            <p className="panel-body">
              Start on paper. The chapter lays the foundation — the module builds on it.
            </p>
          </div>
          <div className="panel panel--watch">
            <p className="panel-kicker">Watch</p>
            <h2 className="panel-title">{unit.live ? "10-minute module" : "Module in production"}</h2>
            <p className="panel-body">
              {unit.live
                ? "Short, plain English, zero filler."
                : "The chapter has you covered until this drops."}
            </p>
            <div className="watch-frame" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="watch-play">
                <path
                  fill="currentColor"
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="panel panel--do">
          <p className="panel-kicker">Do</p>
          <h2 className="panel-title">Homework is your real life</h2>
          <p className="panel-body">{unit.part.action}</p>
        </div>

        <div className="unit-actions">
          <button
            type="button"
            className={isDone ? "btn btn--outline unit-done-btn" : "btn btn--solid unit-done-btn"}
            onClick={() => toggle(slug)}
            disabled={!loaded}
          >
            {isDone ? "Completed ✓ (Undo)" : "Mark Unit Complete"}
          </button>
        </div>

        <nav className="unit-nav">
          {prev ? (
            <Link href={`/learn/${prev.slug}`} className="unit-nav-link">
              ← {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/learn/${next.slug}`} className="unit-nav-link">
              {next.title} →
            </Link>
          ) : (
            <Link href="/learn" className="unit-nav-link">
              Back to the Syllabus →
            </Link>
          )}
        </nav>
      </div>
    </div>
  );
}
