"use client";

import { useRef } from "react";
import Wordmark from "./Wordmark";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";

const UNITS = [
  {
    unit: "UNIT 01",
    lessons: "6 lessons",
    title: "Money 101",
    body: "Budgeting that doesn't feel like punishment. Where your paycheck actually goes.",
    card: "card--ink",
    pill: "pill--acc",
  },
  {
    unit: "UNIT 02",
    lessons: "5 lessons",
    title: "Tax Season, Decoded",
    body: "W-2? 1099? Refund? Plain English, before April ruins your month.",
    card: "card--vio",
    pill: "pill--white-vio",
  },
  {
    unit: "UNIT 03",
    lessons: "7 lessons",
    title: "Credit Glow-Up",
    body: 'From "no score" to "approved" — without falling for a single trap.',
    card: "card--acc",
    pill: "pill--ink-acc",
  },
  {
    unit: "UNIT 04",
    lessons: "5 lessons",
    title: "Mindset Hacks",
    body: "Habits, discipline, and talking to yourself like a coach instead of a critic.",
    card: "card--coral",
    pill: "pill--ink-coral",
  },
  {
    unit: "UNIT 05",
    lessons: "6 lessons",
    title: "Invest, Eventually",
    body: "401(k)s and index funds for people with fifty bucks and a dream.",
    card: "card--lime",
    pill: "pill--ink-lime",
  },
  {
    unit: "UNIT 06",
    lessons: "8 lessons",
    title: "The Big Calls",
    body: "Career moves, new cities, big relationships — a framework for the decisions that shape your decade.",
    card: "card--ink",
    pill: "pill--coral",
  },
];

const GRADES = [
  {
    num: "13",
    tone: "tone-acc",
    pill: "pill--acc",
    status: "Start Here",
    title: "The 13th Grade",
    body: "The intro course. Working on your mindset, your money, and dealing with life's big calls — the foundations of running your own life, in 24 units.",
    link: "Enroll Free →",
  },
  {
    num: "14",
    tone: "tone-vio",
    pill: "pill--vio",
    status: "Next Up",
    title: "The 14th Grade",
    body: "All money, all year. How to handle it, understand it, and make the right financial decisions — personal finance, mastered.",
    link: "Join the Waitlist →",
  },
  {
    num: "15",
    tone: "tone-coral",
    pill: "pill--coral",
    status: "Final Year",
    title: "The 15th Grade",
    body: "The big calls in life — career, place, people — and how to actually think them through instead of flipping a coin.",
    link: "Join the Waitlist →",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Read",
    body: "Start with the book. Every unit begins as a chapter — read it on your own time, at your own pace.",
    tone: "how-panel--acc",
    icon: "M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z",
  },
  {
    num: "02",
    title: "Watch",
    body: 'Each chapter pairs with a 10-minute companion module. No 40-slide decks, no "circle back."',
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
    tone: "how-panel--paper",
    icon: "M9.68 13.69L12 11.93l2.31 1.76-.88-2.85L15.75 9h-2.84L12 6.19 11.09 9H8.25l2.31 1.84-.88 2.85zM20 10c0-4.42-3.58-8-8-8s-8 3.58-8 8c0 2.03.76 3.87 2 5.28V23l6-2 6 2v-7.72c1.24-1.41 2-3.25 2-5.28zm-8-6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6 2.69-6 6-6zm0 15l-4 1.02v-3.1c1.18.68 2.54 1.08 4 1.08s2.82-.4 4-1.08v3.1L12 19z",
  },
  {
    num: "05",
    title: "Repeat",
    body: "New units drop every month. Adulting doesn't graduate, and neither do we.",
    tone: "how-panel--ink",
    icon: "M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z",
  },
];

const STATS = [
  { count: 40, suffix: "+", display: "40+", label: "Lessons live now", tone: "stat--acc" },
  { count: 10, suffix: " min", display: "10 min", label: "Average lesson", tone: "stat--vio" },
  { count: 0, prefix: "$", display: "$0", label: "Tuition, forever", tone: "stat--coral" },
  { count: 0, display: "0", label: "Pop quizzes", tone: "" },
];

const MARQUEE =
  "Mindset ★ Money ★ Habits ★ Big calls ★ Taxes ★ Credit ★ 401(k) ★ Negotiation ★ Relationships ★ Emotional intelligence ★ Purpose ★ Boundaries ★ Insurance ★ First apartments ★";

export default function Home() {
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const howRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Hero intro
        gsap.from("[data-hero-kicker]", { y: 20, opacity: 0, duration: 0.7, ease: "power3.out" });
        gsap.from("[data-hline]", { yPercent: 115, duration: 1.05, stagger: 0.1, ease: "power4.out", delay: 0.1 });
        gsap.from("[data-hero-sub] > *", { y: 30, opacity: 0, duration: 0.8, stagger: 0.12, delay: 0.55, ease: "power3.out" });
        gsap.from("[data-sticker]", { scale: 0, opacity: 0, duration: 0.7, stagger: 0.14, delay: 0.8, ease: "back.out(2.2)" });
        gsap.from("[data-wm]", { opacity: 0, x: 80, duration: 1.4, ease: "power2.out", delay: 0.3 });

        // Watermark parallax
        gsap.to("[data-wm]", {
          y: 160,
          ease: "none",
          scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: true },
        });

        // Marquee: shift exactly one of the three copies per cycle (seamless).
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

        // Pinned horizontal scroll
        const track = trackRef.current;
        const hwrap = howRef.current;
        if (track && hwrap) {
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

        // Counters
        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
          const target = parseFloat(el.dataset.count || "0");
          if (!target) return;
          const prefix = el.dataset.prefix || "";
          const suffix = el.dataset.suffix || "";
          const obj = { v: 0 };
          gsap.to(obj, {
            v: target,
            duration: 1.6,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
            onUpdate: () => {
              el.textContent = prefix + Math.round(obj.v) + suffix;
            },
          });
        });
      });

      document.fonts?.ready.then(() => ScrollTrigger.refresh());
    },
    { scope: rootRef }
  );

  return (
    <div ref={rootRef}>
      <header id="top" ref={heroRef} className="hero">
        <div data-wm aria-hidden="true" className="wm">
          SM
        </div>
        <div data-sticker className="sticker sticker--quiz">
          no pop quizzes ✓
        </div>
        <div data-sticker className="sticker sticker--free">
          actually free
        </div>
        <p data-hero-kicker className="kicker kicker--acc kicker--hero">
          ★ Class is in session
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
            Working on your mindset, your money, and dealing with life's big calls — all the adult stuff you were supposed to just <em>know</em>. We teach
            it in plain English. You crush it. Welcome to Self Made School.
          </p>
          <div className="hero-ctas">
            <a href="#enroll" className="btn btn--solid">
              Enroll Free →
            </a>
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

      <section id="syllabus" className="section-paper syllabus">
        <div className="container">
          <p data-reveal className="kicker kicker--vio">
            The 13th Grade — Intro Course Syllabus
          </p>
          <h2 data-reveal className="h2">
            Six units. Zero lectures about mitochondria.
          </h2>
          <div className="card-grid">
            {UNITS.map((u) => (
              <div key={u.unit} data-card className={`card ${u.card}`}>
                <div className="card-top">
                  <span className="unit-label">{u.unit}</span>
                  <span className={`pill ${u.pill}`}>{u.lessons}</span>
                </div>
                <div>
                  <h3 className="card-title">{u.title}</h3>
                  <p className="card-body">{u.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="grades" className="section-paper grades">
        <div className="container">
          <p data-reveal className="kicker kicker--vio">
            The Grades
          </p>
          <h2 data-reveal className="h2">
            School&apos;s back on. Three grades to go.
          </h2>
          <div className="grade-grid">
            {GRADES.map((g) => (
              <div key={g.num} data-card className="card card--ink grade-card">
                <div className="grade-top">
                  <span className={`grade-num ${g.tone}`}>{g.num}</span>
                  <span className={`pill ${g.pill}`}>{g.status}</span>
                </div>
                <div>
                  <h3 className="grade-title">{g.title}</h3>
                  <p className="grade-body">{g.body}</p>
                  <a href="#enroll" className={`grade-link ${g.tone}`}>
                    {g.link}
                  </a>
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
            Five steps. Keep scrolling →
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
          <div className="stats-grid">
            {STATS.map((s) => (
              <div key={s.label} data-reveal className={`stat ${s.tone}`}>
                <span data-count={s.count} data-prefix={s.prefix} data-suffix={s.suffix} className="stat-num">
                  {s.display}
                </span>
                <p className="stat-label">{s.label}</p>
              </div>
            ))}
          </div>
          <blockquote data-reveal className="quote">
            <p>&quot;I came for the money stuff. The mindset unit is the one I keep re-watching.&quot;</p>
            <cite>— Maya, 24 · The 13th Grade, Class of &apos;26</cite>
          </blockquote>
        </div>
      </section>

      <section id="book" className="book-section">
        <div className="book-grid">
          <div>
            <p data-reveal className="kicker">
              Required Reading
            </p>
            <h2 data-reveal className="h2 h2--book">
              The textbook adulthood never gave you.
            </h2>
            <p data-reveal className="book-blurb">
              Every unit of The 13th Grade — working on your mindset, your money, and dealing with life's big calls — rewritten as a book you can
              dog-ear, gift, and re-read the night before a big decision. Plain English, cover to cover.
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
            <div data-card className="book-cover">
              <span className="book-brand">
                <Wordmark gid="dawn-bookcover" />
              </span>
              <div>
                <span className="book-num">
                  13<span className="dot">.</span>
                </span>
                <h3 className="book-title">The 13th Grade</h3>
                <p className="book-sub">The missing textbook for your first decade of adulthood.</p>
              </div>
              <div className="book-foot">
                <svg className="book-mark" viewBox="0 0 300 20" aria-hidden="true">
                  <defs>
                    <linearGradient id="dawn-book" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0" stopColor="#F5A83C" />
                      <stop offset="0.55" stopColor="#B8C94F" />
                      <stop offset="1" stopColor="#43DE7B" />
                    </linearGradient>
                  </defs>
                  <path d="M6,15.5 C90,12 190,8.5 268,4.5 L268,11.5 C190,14.5 90,17 6,19 Z" fill="url(#dawn-book)" />
                  <path d="M264,0.5 L298,8 L265,15.5 Z" fill="#43DE7B" />
                </svg>
                <span>First Edition · Class of &apos;26</span>
              </div>
            </div>
            <div data-sticker className="sticker sticker--book">
              parent approved ✓
            </div>
          </div>
        </div>
      </section>

      <section id="enroll" className="enroll">
        <p data-reveal className="kicker kicker--enroll">
          Enrollment is open
        </p>
        <h2 data-reveal className="h2 h2--enroll">
          Your first adult
          <br />
          decision? This one.
        </h2>
        <div data-reveal className="enroll-ctas">
          <a href="#top" className="btn btn--ink">
            Start the 13th Grade — Free
          </a>
        </div>
        <p data-reveal className="enroll-note">
          No credit card. Ironically.
        </p>
      </section>
    </div>
  );
}
