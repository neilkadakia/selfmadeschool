"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Wordmark from "./Wordmark";
import SyllabusExplorer from "./SyllabusExplorer";
import Newsletter from "./Newsletter";
import Quotes from "./Quotes";
import { FAQS } from "@/lib/faqs";
import { scrollToHash } from "@/lib/anchor";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";

const GRADES = [
  {
    num: "13",
    tone: "tone-acc",
    pill: "pill--acc",
    status: "Start Here",
    title: "The 13th Grade",
    body: "The foundational and introductory course. Working on your mindset, your money, and dealing with life's big calls: the groundwork for running your own life, in 24 units.",
    link: "Enroll Free →",
  },
  {
    num: "14",
    tone: "tone-vio",
    pill: "pill--vio",
    status: "Next Up",
    title: "The 14th Grade",
    body: "All money, all year. How to handle it, understand it, and make the right financial decisions. Personal finance, mastered.",
    link: "Join the Waitlist →",
  },
  {
    num: "15",
    tone: "tone-coral",
    pill: "pill--coral",
    status: "Final Year",
    title: "The 15th Grade",
    body: "Emotional intelligence, purpose, and the big calls in life (career, place, people): how to actually think them through instead of flipping a coin.",
    link: "Join the Waitlist →",
  },
];

/* The jacket copy, as the author wrote it. */
const BACK_COVER = [
  "I wrote this for one person: myself, at eighteen.",
  "Everything before that was aimed at one thing: getting into college. Thirteen years of work for an acceptance letter—and almost nothing for the life waiting on the other side of it.",
  "No one handed me a manual—how money actually works, how to think when a decision is real and the cost is mine, how to tell the few choices that quietly shape a life from the noise of the ones that don’t. I learned most of it the slow way, and a fair amount of it the expensive way.",
  "This is everything I wish someone had told me before I walked into my twenties. Not a weekend read—a year you can take on your own. A long, honest letter with a real curriculum to help you through topics like mindset, money, and the big calls, written so you can skip a few of the mistakes I didn’t.",
  "Some of the people sprinting ahead of you now will be stuck in a decade. Some of the ones who look behind will quietly pull away. This is about how to pull away and set yourself up for success in your twenties.",
  "This is the manual I needed. Now it’s yours.",
];

/* Printed furniture, not a scannable code. Bar widths are fixed rather than
   random so the server and the browser draw the same barcode; the guard bars
   run long past the digits the way they do on a real EAN-13. */
const BARCODE = [
  1, 1, 2, 1, 1, 2, 3, 1, 1, 2, 2, 1, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 2, 1, 1, 3, 1, 2, 1, 1, 2, 1, 1, 3, 2, 1, 1, 2, 1,
  2, 3, 1, 1, 1, 2, 2, 1, 1, 3, 1, 2, 2, 1, 1, 1, 3, 1, 2, 1, 1, 2, 2, 1, 1, 3, 2, 1, 1, 1, 2, 1, 3, 1, 1, 2, 1, 2, 1, 3,
  1, 1, 2, 2, 1, 1, 1, 3, 1, 2, 1, 1, 2, 1, 1,
];
const BARCODE_GUARDS = new Set([0, 2, 46, 48, 92, 94]);

/* Every other run is ink; the ones between are the paper showing through.
   Resolved once at module load so the draw is a plain map. */
const BARCODE_INK = (() => {
  const bars: { x: number; w: number; tall: boolean }[] = [];
  let x = 0;
  BARCODE.forEach((w, i) => {
    if (i % 2 === 0) bars.push({ x, w, tall: BARCODE_GUARDS.has(i) });
    x += w;
  });
  return { bars, width: x };
})();

function Barcode() {
  return (
    <span className="book-barcode" aria-hidden="true">
      <svg viewBox={`0 0 ${BARCODE_INK.width} 34`} preserveAspectRatio="none" focusable="false">
        {BARCODE_INK.bars.map((b) => (
          <rect key={b.x} x={b.x} y={0} width={b.w} height={b.tall ? 34 : 29} />
        ))}
      </svg>
      <span className="book-barcode-digits">9 781234 567890</span>
    </span>
  );
}

const STEPS = [
  {
    num: "01",
    title: "Read",
    body: "Start with the book. Every unit begins as a chapter. Read it on your own time, at your own pace.",
    tone: "how-panel--acc",
    icon: "M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z",
  },
  {
    num: "02",
    title: "Watch",
    body: 'Each chapter pairs with a unit that runs about 20 minutes start to finish, video and practice included. No 40-slide decks, no "circle back."',
    tone: "how-panel--vio",
    icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z",
  },
  {
    num: "03",
    title: "Do",
    body: "Real challenges with your real numbers: build the budget, file the thing, make the call.",
    tone: "how-panel--coral",
    icon: "M22 5.18L10.59 16.6l-4.24-4.24 1.41-1.41 2.83 2.83 10-10L22 5.18zm-2.21 5.04c.13.57.21 1.17.21 1.78 0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8c1.58 0 3.04.46 4.28 1.25l1.44-1.44C16.1 2.67 14.13 2 12 2 6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10c0-1.19-.22-2.33-.6-3.39l-1.61 1.61z",
  },
  {
    num: "04",
    title: "Flex",
    body: 'Earn unit badges and a certificate that says "I have my life together (mostly)."',
    tone: "how-panel--pink",
    icon: "M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z",
  },
  {
    num: "05",
    title: "Repeat",
    body: "Build, break, rebuild. Self-made isn't a one-time project. You run the loop again every time life changes. New units drop monthly to keep up.",
    tone: "how-panel--ink",
    icon: "M18.6 6.62c-1.44 0-2.8.56-3.77 1.53L12 10.66 10.48 12h.01L7.8 14.39c-.64.64-1.49.99-2.4.99-1.87 0-3.39-1.51-3.39-3.38S3.53 8.62 5.4 8.62c.91 0 1.76.35 2.44 1.03l1.13 1 1.51-1.34L9.22 8.2C8.2 7.18 6.84 6.62 5.4 6.62 2.42 6.62 0 9.04 0 12s2.42 5.38 5.4 5.38c1.44 0 2.8-.56 3.77-1.53l2.83-2.5.01.01L13.52 12h-.01l2.69-2.39c.64-.64 1.49-.99 2.4-.99 1.87 0 3.39 1.51 3.39 3.38s-1.52 3.38-3.39 3.38c-.9 0-1.76-.35-2.44-1.03l-1.14-1.01-1.51 1.34 1.27 1.12c1.02 1.01 2.37 1.57 3.82 1.57 2.98 0 5.4-2.41 5.4-5.38s-2.42-5.37-5.4-5.37z",
  },
];

// The row counts as a cascade, left to right. Two of them run backwards,
// which is the joke: tuition falls off a cliff and the parabolas drop to
// nothing, both faster than the honest numbers climb. Real life lands last.
// `widest` is the longest string each counter passes through. It gets rendered
// invisibly behind the live number so the column is already that wide: without
// it, 99 becoming 100 shoves the % sign sideways mid-count.
const STATS = [
  { from: 0, to: 24, suffix: "/24", display: "24/24", widest: "24/24", label: "13th Grade units live", tone: "stat--acc", dur: 2.2 },
  { from: 0, to: 20, suffix: " min", display: "20 min", widest: "20 min", label: "Average unit", tone: "stat--vio", dur: 2 },
  { from: 1000, to: 0, prefix: "$", display: "$0", widest: "$1,000", label: "Tuition, forever", tone: "stat--coral", dur: 1.7, ease: "power3.out" },
  { from: 100, to: 0, display: "0", widest: "100", label: "Parabolas", tone: "", dur: 1.2, ease: "power4.out" },
  // No overshoot on this one: 106% real life reads as a bug, not a joke.
  { from: 0, to: 100, suffix: "%", display: "100%", widest: "100%", label: "Real life relevance", tone: "stat--lime", dur: 1.9, ease: "expo.out" },
];

const MANTRA_WORDS = ["Build", "Grow", "Break", "Remake", "Restart"];

const MARQUEE =
  "Mindset ★ Money ★ Habits ★ Discipline ★ Big calls ★ Taxes ★ Credit ★ 401(k) ★ Negotiation ★ Relationships ★ Emotional intelligence ★ Purpose ★ First Principles Thinking ★ Boundaries ★ Insurance ★ First apartments ★ Build ★ Break ★ Rebuild ★";

export default function Home() {
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const howRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  // Hover turns the book on its own; this is the same turn for touch and
  // keyboard, where there is no hover to lean on.
  const [backCover, setBackCover] = useState(false);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Hero intro
        gsap.from("[data-hero-kicker]", { y: 20, opacity: 0, duration: 0.7, ease: "power3.out" });
        gsap.from("[data-hline]", { yPercent: 115, duration: 1.05, stagger: 0.1, ease: "power4.out", delay: 0.1 });
        gsap.from("[data-hero-sub] > *", { y: 30, opacity: 0, duration: 0.8, stagger: 0.12, delay: 0.55, ease: "power3.out" });
        // clearProps hands the stickers back to CSS, so the book's sticker can
        // fade out on its own when the cover turns.
        gsap.from("[data-sticker]", {
          scale: 0,
          opacity: 0,
          duration: 0.7,
          stagger: 0.14,
          delay: 0.8,
          ease: "back.out(2.2)",
          onComplete: () => gsap.set("[data-sticker]", { clearProps: "transform,opacity" }),
        });
        gsap.from(".hero-grid", { opacity: 0, duration: 1.6, ease: "power2.out", delay: 0.2 });

        // The paper drifts up a little slower than the page, so the hero has
        // depth on the way out. The cursor light rides with it to stay in
        // register with the ruling.
        gsap.to(".hero-grid, .hero-spot", {
          y: 90,
          ease: "none",
          scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: true },
        });

        // Two pointer effects, fine pointers only: the light leans away from
        // the cursor, and a soft circle of brighter ruling follows it, so the
        // graph paper reads as lit rather than printed on.
        const bg = bgRef.current;
        const hero = heroRef.current;
        let onMove: ((e: PointerEvent) => void) | undefined;
        if (bg && hero && window.matchMedia("(pointer: fine)").matches) {
          const xTo = gsap.quickTo(bg, "x", { duration: 1.1, ease: "power3.out" });
          const yTo = gsap.quickTo(bg, "y", { duration: 1.1, ease: "power3.out" });
          const mxTo = gsap.quickTo(hero, "--mx", { duration: 0.4, ease: "power2.out" });
          const myTo = gsap.quickTo(hero, "--my", { duration: 0.4, ease: "power2.out" });
          onMove = (e: PointerEvent) => {
            xTo((e.clientX / window.innerWidth - 0.5) * -38);
            yTo((e.clientY / window.innerHeight - 0.5) * -26);
            const r = hero.getBoundingClientRect();
            mxTo(e.clientX - r.left);
            myTo(e.clientY - r.top);
            // Only once the light has somewhere real to be.
            hero.classList.add("hero--lit");
          };
          window.addEventListener("pointermove", onMove, { passive: true });
        }

        // Marquee: shift exactly one of the three copies per cycle (no visible seam).
        // Duration scaled with the longer topic list to keep the original speed.
        gsap.to("[data-mq]", { xPercent: -100 / 3, duration: 40, repeat: -1, ease: "none" });

        // Scroll reveals
        gsap.utils.toArray<HTMLElement>("[data-card]").forEach((el, i) => {
          gsap.from(el, {
            y: 70,
            opacity: 0,
            rotation: i % 2 ? 2.5 : -2.5,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
            onComplete: () => gsap.set(el, { clearProps: "transform,opacity" }),
          });
        });
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
          gsap.from(el, {
            y: 44,
            opacity: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
            onComplete: () => gsap.set(el, { clearProps: "transform,opacity" }),
          });
        });

        // Mantra words land one after another, left to right
        gsap.utils.toArray<HTMLElement>("[data-mantra-row]").forEach((row) => {
          const words = Array.from(row.children);
          gsap.from(words, {
            y: 34,
            opacity: 0,
            duration: 0.7,
            stagger: 0.09,
            ease: "back.out(1.7)",
            scrollTrigger: { trigger: row, start: "top 88%", once: true },
            onComplete: () => gsap.set(words, { clearProps: "transform,opacity" }),
          });
        });

        // Pinned horizontal scroll
        const track = trackRef.current;
        const hwrap = howRef.current;
        if (track && hwrap) {
          // The CSS base state is a native swipe rail (reduced-motion / no-JS
          // path); the pin drives the track itself, so take the scrollbar away.
          // matchMedia's revert restores it.
          //
          // Snapping has to go with it: the rail snaps to the first panel's
          // start edge, which scrolls the container by exactly the track's
          // left padding and drags the heading off the page's left margin
          // with it. Kill the snap, then undo the scroll it already did.
          gsap.set(hwrap, { overflow: "hidden", scrollSnapType: "none" });
          hwrap.scrollLeft = 0;
          const dist = () => track.scrollWidth - window.innerWidth + 64;
          gsap.to(track, {
            x: () => -dist(),
            ease: "none",
            scrollTrigger: {
              trigger: hwrap,
              pin: true,
              scrub: 1,
              start: "top top",
              end: () => "+=" + dist(),
              invalidateOnRefresh: true,
            },
          });
        }

        // Counters: one cascade for the whole row rather than five separate
        // triggers, so the numbers land left to right instead of at once.
        // Two of them count down, which is the joke.
        const strip = document.querySelector("[data-stats]");
        if (strip) {
          const tl = gsap.timeline({
            scrollTrigger: { trigger: strip, start: "top 85%", once: true },
          });
          gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el, i) => {
            const from = parseFloat(el.dataset.from || "0");
            const to = parseFloat(el.dataset.to || "0");
            const prefix = el.dataset.prefix || "";
            const suffix = el.dataset.suffix || "";
            const obj = { v: from };
            tl.to(
              obj,
              {
                v: to,
                duration: parseFloat(el.dataset.dur || "1.4"),
                ease: el.dataset.ease || "power2.out",
                onUpdate: () => {
                  el.textContent =
                    prefix + Math.round(obj.v).toLocaleString("en-US") + suffix;
                },
              },
              i * 0.16
            );
          });
        }

        return () => {
          if (onMove) window.removeEventListener("pointermove", onMove);
          heroRef.current?.classList.remove("hero--lit");
        };
      });

      document.fonts?.ready.then(() => ScrollTrigger.refresh());
    },
    { scope: rootRef }
  );

  // Arriving with a hash (from another page, a shared link, or the back
  // button). The browser scrolls before the display font swaps and before the
  // pins measure, which lands you short. Land it again once both are settled.
  useEffect(() => {
    const land = () => {
      if (window.location.hash) scrollToHash(window.location.hash, false);
    };
    if (window.location.hash) {
      void (document.fonts?.ready ?? Promise.resolve()).then(() =>
        requestAnimationFrame(land)
      );
    }
    window.addEventListener("hashchange", land);
    return () => window.removeEventListener("hashchange", land);
  }, []);

  return (
    <div ref={rootRef}>
      <header id="top" ref={heroRef} className="hero">
        {/* Graph paper in the dark with dawn coming up behind it. The paper
            stays put so the ruling stays sharp and the cursor light lines up
            with it; the light itself drifts and leans toward the pointer. */}
        <div ref={gridRef} className="hero-grid" aria-hidden="true">
          <span className="hero-cell hero-cell--1" />
          <span className="hero-cell hero-cell--2" />
          <span className="hero-cell hero-cell--3" />
          <span className="hero-cell hero-cell--4" />
        </div>
        <div className="hero-spot" aria-hidden="true" />
        <div ref={bgRef} className="hero-bg" aria-hidden="true">
          <span className="hero-orb hero-orb--acc" />
          <span className="hero-orb hero-orb--vio" />
          <span className="hero-dawn" />
          <span className="hero-vignette" />
        </div>
        {/* Scattered around the hero on wide screens (the wrapper is
            display: contents there, so each one positions against the hero
            itself). On phones the wrapper becomes a real row above the kicker,
            because anything pinned by percentage near the top eventually ends
            up under the fixed nav on a short screen. */}
        <div className="stickers">
          <div data-sticker className="sticker sticker--quiz">
            no pop quizzes ✓
          </div>
          <div data-sticker className="sticker sticker--free">
            actually free
          </div>
          <div data-sticker className="sticker sticker--academic">
            0% academic
          </div>
        </div>
        <p data-hero-kicker className="kicker kicker--acc kicker--hero">
          ★ Pre-launch
        </p>
        <h1 className="hero-h1">
          <span className="hline-mask">
            <span data-hline className="hline">
              School never
            </span>
          </span>
          <span className="hline-mask">
            <span data-hline className="hline">
              taught you
            </span>
          </span>
          <span className="hline-mask">
            <span data-hline className="hline hline--acc">
              this<span className="dot">.</span>
            </span>
          </span>
        </h1>
        <div data-hero-sub className="hero-sub">
          <p className="hero-copy">
            Mindset, money, and the decisions that actually shape a life: the adult stuff nobody sat you down and
            explained. There&apos;s no syllabus here, no grades, no lecture hall. Just plain English and skills you can
            use by Friday. Time to start making yourself.
          </p>
          <div className="hero-ctas">
            <Link href="/demo/lesson" className="btn btn--solid">
              Try the Demo Lesson →
            </Link>
            <a href="#syllabus" className="btn btn--outline">
              See the Syllabus
            </a>
          </div>
        </div>
      </header>

      <div className="marquee-band">
        {/* Three copies + one-copy shift: track stays covered up to ~2 copy-widths
            of viewport, so the band never shows a gap mid-loop. */}
        <div data-mq className="marquee-track">
          <span>{MARQUEE}&nbsp;</span>
          <span aria-hidden="true">{MARQUEE}&nbsp;</span>
          <span aria-hidden="true">{MARQUEE}&nbsp;</span>
        </div>
      </div>

      <section id="the-point" className="mantra-section">
        <div className="mantra-glow" aria-hidden="true" />
        <div className="container mantra-inner">
          <h2 data-reveal className="mantra-h2">
            You are the greatest project you&apos;ll ever <span className="mantra-em">work on</span>
            <span className="dot">.</span>
          </h2>
          <ul data-mantra-row className="mantra-words">
            {MANTRA_WORDS.map((w) => (
              <li key={w} className="mantra-word">
                {w}
              </li>
            ))}
          </ul>
          <p data-reveal className="mantra-sub">
            As many times as you need. There is no late pass here, no final grade you cannot retake, and
            no version of you that started too late. Everyone you look up to has rebuilt themselves more
            than once, and most of them are still doing it.{" "}
            <strong className="mantra-strong">Just don&apos;t give up.</strong>
          </p>
        </div>
      </section>

      <section id="syllabus" className="section-paper syllabus">
        <div className="container">
          <p data-reveal className="kicker kicker--vio">
            The 13th Grade · Intro Course Syllabus
          </p>
          <h2 data-reveal className="h2">
            24 units. Zero lectures about trigonometry.
          </h2>
          <div data-reveal>
            <SyllabusExplorer />
          </div>
        </div>
      </section>

      <section id="grades" className="grades">
        <div className="container">
          <p data-reveal className="kicker kicker--coral">
            The Grades
          </p>
          <h2 data-reveal className="h2">
            School&apos;s back on. Three grades to go.
          </h2>
          <div className="grade-grid">
            {GRADES.map((g) => (
              <div key={g.num} data-card className="card grade-card">
                <div className="grade-top">
                  <span className={`grade-num ${g.tone}`}>{g.num}</span>
                  <span className={`pill ${g.pill}`}>{g.status}</span>
                </div>
                <div>
                  <h3 className="grade-title">{g.title}</h3>
                  <p className="grade-body">{g.body}</p>
                  <Link
                    href={g.link.startsWith("Enroll") ? "/learn" : "#newsletter"}
                    className={`grade-link ${g.tone}`}
                  >
                    {g.link}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" ref={howRef} className="how">
        <div className="how-head">
          <p data-reveal className="kicker kicker--acc">
            How it works
          </p>
          <h2 data-reveal className="h2 h2--how">
            Five steps. Keep scrolling{" "}
            {/* Points right (where the steps go), then turns down (where you scroll). */}
            <span className="how-arrow" aria-hidden="true">
              →
            </span>
          </h2>
        </div>
        <div ref={trackRef} className="how-track">
          {STEPS.map((s) => (
            <div key={s.num} className={`how-panel ${s.tone}`}>
              <div className="how-top">
                <span className="how-num">{s.num}</span>
                <svg className="how-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d={s.icon} />
                </svg>
              </div>
              <div>
                <h3 className="how-title">{s.title}</h3>
                <p className="how-body">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="receipts" className="receipts">
        <div className="container">
          <div data-stats className="stats-grid">
            {STATS.map((s) => (
              <div key={s.label} data-reveal className={`stat ${s.tone}`}>
                <span className="stat-num">
                  <span className="stat-num-ghost" aria-hidden="true">
                    {s.widest}
                  </span>
                  <span
                    data-count
                    data-from={s.from}
                    data-to={s.to}
                    data-prefix={s.prefix}
                    data-suffix={s.suffix}
                    data-dur={s.dur}
                    data-ease={s.ease}
                    className="stat-num-live"
                  >
                    {s.display}
                  </span>
                </span>
                <p className="stat-label">{s.label}</p>
              </div>
            ))}
          </div>
          <Quotes />
        </div>
      </section>

      <section id="book" className="book-section">
        <div className="book-grid">
          <div>
            <p data-reveal className="kicker">
              Required Reading
            </p>
            <h2 data-reveal className="h2 h2--book">
              The textbook school never gave you.
            </h2>
            <p data-reveal className="book-blurb">
              Every unit of The 13th Grade (your mindset, your money, and dealing with life&apos;s big calls) rewritten as a book you can
              highlight, gift, and re-read the night before a big decision. Plain English, cover to cover.
            </p>
            <div data-reveal className="book-meta">
              <span className="pill pill--ink-coral">312 pages</span>
              <span className="pill pill--ink-coral">All 24 units</span>
              <span className="pill pill--ink-coral">Zero pop quizzes</span>
            </div>
            <div data-reveal className="book-ctas">
              <a href="#enroll" className="btn btn--ink">
                Get the Book →
              </a>
              <a href="#syllabus" className="btn btn--outline-ink">
                Read a Sample
              </a>
            </div>
          </div>
          <div className="book-stage">
            {/* One object with two faces. It turns on the vertical axis like a
                book you pick up off a table: hover to read the jacket copy, or
                press the control below on a screen that has no hover. */}
            <div data-card className={"book-flip" + (backCover ? " is-turned" : "")}>
              <div className="book-flip-inner">
                {/* The cover carries the school's whole language: graph paper
                    up top, the dawn underline grown into a sunrise across the
                    bottom, a ribbon so it reads as an object. */}
                <div className="book-cover">
                  <span className="book-rule" aria-hidden="true" />
                  <span className="book-dawn" aria-hidden="true" />
                  <span className="book-ribbon" aria-hidden="true" />
                  <span className="book-brand">
                    <Wordmark gid="dawn-bookcover" />
                  </span>
                  <div className="book-mid">
                    <span className="book-num">
                      13<span className="dot">.</span>
                    </span>
                    <h3 className="book-title">The 13th Grade</h3>
                    <p className="book-sub">The missing textbook for your first decade of adulthood.</p>
                  </div>
                  <div className="book-foot">
                    <span>Neil R. Kadakia</span>
                  </div>
                </div>
                {/* The back: hook line, jacket copy, imprint and barcode down
                    on the sunrise, with the spine and page edge mirrored so
                    the turn reads as one physical object. */}
                <div className="book-back" id="book-back">
                  <span className="book-rule book-rule--back" aria-hidden="true" />
                  <span className="book-back-dawn" aria-hidden="true" />
                  <span className="book-ribbon book-ribbon--back" aria-hidden="true" />
                  <p className="book-back-hook">
                    Twelve years got you into college.
                    <br />
                    Not one got you ready for life.
                  </p>
                  <div className="book-back-copy">
                    {BACK_COVER.map((para) => (
                      <p key={para.slice(0, 24)}>{para}</p>
                    ))}
                  </div>
                  <div className="book-back-foot">
                    <span className="book-back-imprint">
                      <Wordmark gid="dawn-bookback" />
                      <span className="book-back-site">selfmadeschool.org</span>
                    </span>
                    <Barcode />
                  </div>
                </div>
              </div>
            </div>
            <div data-sticker className="sticker sticker--book">
              parent approved ✓
            </div>
            <button
              type="button"
              className="book-turn"
              aria-pressed={backCover}
              aria-controls="book-back"
              onClick={() => setBackCover((v) => !v)}
            >
              {backCover ? "See the Cover" : "Read the Back"}
            </button>
          </div>
        </div>
      </section>

      <section id="faq" className="faq">
        <div className="container">
          <p data-reveal className="kicker kicker--acc">
            Office Hours
          </p>
          <h2 data-reveal className="h2 h2--faq">
            Questions everyone asks.
          </h2>
          <div className="faq-grid">
            {FAQS.map((f) => (
              <div key={f.q} data-reveal className="faq-item">
                <h3 className="faq-q">{f.q}</h3>
                <p className="faq-a">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="newsletter" className="newsletter">
        <div className="container nl-wrap">
          <div data-reveal className="nl-copy">
            <p className="kicker kicker--acc">Extra Credit</p>
            {/* The space before the break matters: .br-wide is display:none on
                phones, and without it the two lines run together as "yourinbox". */}
            <h2 className="h2 nl-h2">
              One lesson in your{" "}
              <br className="br-wide" />
              inbox, every month.
            </h2>
            <p className="nl-sub">
              Mindset, money, and the big calls. One real lesson a month while we finish building.
              This list is also the waitlist: when the founding class opens, these inboxes hear
              first. No spam, unsubscribe anytime.
            </p>
          </div>
          <div data-reveal className="nl-side">
            <Newsletter />
          </div>
        </div>
      </section>

      <section id="enroll" className="enroll">
        <p data-reveal className="kicker kicker--enroll">
          Pre-launch · doors open soon
        </p>
        <h2 data-reveal className="h2 h2--enroll">
          Your first adult{" "}
          <br className="br-wide" />
          decision? This one.
        </h2>
        <div data-reveal className="enroll-ctas">
          <a href="#newsletter" className="btn btn--ink">
            Join the Waitlist
          </a>
          <Link href="/demo/lesson" className="btn btn--ink">
            Try the Demo Lesson
          </Link>
        </div>
        <p data-reveal className="enroll-note">
          The founding class is invite-only while we finish building. The waitlist is the line.
          Free when it opens. No credit card, ironically.
        </p>
      </section>
    </div>
  );
}
