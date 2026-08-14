"use client";

// Home-page syllabus: three part tabs, one swipeable rail of that part's
// 8 real units (from the LMS curriculum). Cards link into the course.

import Link from "next/link";
import { useRef, useState } from "react";
import { PARTS } from "@/lib/curriculum";

// Card colorways cycle so neighbors never match; each part starts at a
// different offset so the three rails don't look identical.
const CARD_TONES = [
  { card: "card--ink", pill: "pill--acc" },
  { card: "card--vio", pill: "pill--white-vio" },
  { card: "card--acc", pill: "pill--ink-acc" },
  { card: "card--coral", pill: "pill--ink-coral" },
  { card: "card--pink", pill: "pill--ink-pink" },
  { card: "card--lime", pill: "pill--ink-lime" },
];

const TAB_TONES: Record<string, string> = {
  acc: "syl-tab--acc",
  vio: "syl-tab--vio",
  coral: "syl-tab--coral",
};

export default function SyllabusExplorer() {
  const [active, setActive] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);

  const part = PARTS[active];

  const slide = (dir: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.querySelector<HTMLElement>(".syl-card");
    const step = card ? (card.offsetWidth + 18) * 2 : rail.clientWidth * 0.8;
    rail.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  const pick = (i: number) => {
    setActive(i);
    railRef.current?.scrollTo({ left: 0 });
  };

  return (
    <div className="syl">
      <div className="syl-tabs" role="tablist" aria-label="Course parts">
        {PARTS.map((p, i) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={i === active}
            className={`syl-tab ${TAB_TONES[p.tone]}${i === active ? " is-active" : ""}`}
            onClick={() => pick(i)}
          >
            <span className="syl-tab-name">{p.name}</span>
            <span className="syl-tab-count">8 units</span>
          </button>
        ))}
      </div>

      <div className="syl-railwrap">
        <div ref={railRef} key={part.id} className="syl-rail" tabIndex={0} aria-label={`${part.name} units`}>
          {part.units.map((u, i) => {
            const tone = CARD_TONES[(i + active * 2) % CARD_TONES.length];
            return (
              <Link
                key={u.slug}
                href={`/learn/the-13th-grade/${u.slug}`}
                className={`card syl-card ${tone.card}`}
                style={{ "--i": i } as React.CSSProperties}
              >
                <div className="card-top">
                  <span className="unit-label">Unit {String(active * 8 + i + 1).padStart(2, "0")}</span>
                  <span className={`pill ${tone.pill}`}>{u.live ? "Lesson + video" : "Full lesson"}</span>
                </div>
                <div>
                  <h3 className="syl-card-title">{u.title}</h3>
                  <p className="syl-card-body">{u.blurb}</p>
                </div>
              </Link>
            );
          })}
        </div>
        <div className="syl-arrows">
          <button className="syl-arrow" aria-label="Previous units" onClick={() => slide(-1)}>
            ←
          </button>
          <button className="syl-arrow" aria-label="Next units" onClick={() => slide(1)}>
            →
          </button>
        </div>
      </div>

      <p className="syl-note">
        Every part is 8 units — one a week, about 20 minutes apiece, each paired with a chapter of the book.{" "}
        <Link href="/learn/the-13th-grade" className="syl-note-link">
          See the Full Course →
        </Link>
      </p>
    </div>
  );
}
