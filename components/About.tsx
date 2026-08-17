"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";

const RULES = [
  {
    num: "01",
    title: "Plain English or nothing",
    body: "If a lesson needs a finance degree to follow, we rewrite the lesson. Jargon is a tax on people who weren't told the rules.",
    card: "card--acc",
  },
  {
    num: "02",
    title: "Doing beats knowing",
    body: "Every unit ends with a real action taken in your real life. A budget you built counts; a budget you watched doesn't.",
    card: "card--vio",
  },
  {
    num: "03",
    title: "No shame in the syllabus",
    body: "Not knowing was never your fault. Nobody taught you. Every question here is a fair one, asked by thousands before you.",
    card: "card--coral",
  },
];

export default function About() {
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-hero-kicker]", { y: 20, opacity: 0, duration: 0.7, ease: "power3.out" });
        gsap.from("[data-hline]", { yPercent: 115, duration: 1.05, stagger: 0.1, ease: "power4.out", delay: 0.1 });
        gsap.from("[data-hero-sub]", { y: 30, opacity: 0, duration: 0.8, delay: 0.5, ease: "power3.out" });
        gsap.from(".hero-grid", { opacity: 0, duration: 1.6, ease: "power2.out", delay: 0.2 });

        gsap.to(".hero-grid", {
          y: 90,
          ease: "none",
          scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: true },
        });

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
      });

      document.fonts?.ready.then(() => ScrollTrigger.refresh());
    },
    { scope: rootRef }
  );

  return (
    <div ref={rootRef}>
      <header ref={heroRef} className="hero about-hero">
        {/* The same field as the home hero, quieter: paper, one light, grain. */}
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-bg" aria-hidden="true">
          <span className="hero-orb hero-orb--acc" />
          <span className="hero-vignette" />
        </div>
        <p data-hero-kicker className="kicker kicker--acc kicker--hero">
          ★ About Self Made School
        </p>
        <h1 className="about-h1">
          <span className="hline-mask">
            <span data-hline className="hline">
              Nobody is born
            </span>
          </span>
          <span className="hline-mask">
            <span data-hline className="hline">
              knowing <span className="acc">this stuff.</span>
            </span>
          </span>
        </h1>
        <p data-hero-sub className="about-sub">
          School taught you trigonometry, then handed you a lease, a W-4, and a 401(k) form and wished you luck. Self
          Made School is the school for everything after the diploma, built for 18-to-30-year-olds who&apos;d rather
          learn it now than regret it at 40.
        </p>
      </header>

      <section className="section-paper mission">
        <div className="container">
          <p data-reveal className="kicker kicker--vio">
            Why we exist
          </p>
          <h2 data-reveal className="h2 h2--mission">
            Adulthood is a curriculum. Someone should teach it.
          </h2>
          <p data-reveal className="mission-copy">
            Every year, millions of people graduate into the most consequential decade of their lives (first
            paychecks, first leases, first big calls) with zero formal preparation. We think that&apos;s absurd. So we
            built the missing grades: the 13th for foundations, the 14th for money, the 15th for the decisions that
            shape everything else.
          </p>
        </div>
      </section>

      <section className="beliefs">
        <div className="container">
          <p data-reveal className="kicker kicker--acc">
            What we believe
          </p>
          <h2 data-reveal className="h2 h2--beliefs">
            Academics are overrated.
          </h2>
          <p data-reveal className="beliefs-lede">
            There. We said it. Life doesn&apos;t grade essays; it hands you decisions. What adults
            actually need are real-life skills, and the most successful, most effective adults all
            share one habit: they learned how to learn, and they never stopped. That&apos;s the whole
            school, and it runs on three house rules.
          </p>
          <div className="grade-grid">
            {RULES.map((r) => (
              <div key={r.num} data-card className={`card rule-card ${r.card}`}>
                <span className="rule-num">{r.num}</span>
                <div>
                  <h3 className="rule-title">{r.title}</h3>
                  <p className="rule-body">{r.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-paper founder">
        <div className="container">
          <p data-reveal className="kicker kicker--vio">
            Who we are
          </p>
          <h2 data-reveal className="h2 h2--mission">
            It started as a letter to three daughters.
          </h2>
          <div className="founder-copy">
            <p data-reveal>
              Self Made School began with Neil Kadakia, a father of three young daughters. He did
              not want them learning the important parts of life the way he did, late and
              expensively, so he started writing them down.
            </p>
            <p data-reveal>
              He was never writing alone. His wife, Archana, built much of what these units
              actually teach: the financial education and the mindset theory at the heart of the
              school. The way every lesson starts with how you talk to yourself before it touches
              what you do with your money, that thinking is hers, worked out over years at their
              own kitchen table.
            </p>
            <p data-reveal>
              What came out was the thing they wished someone had handed them at eighteen. How money
              actually works. What to say to yourself after you fail. How to make a decision you can
              live with. Not a lecture. A manual, in plain English, written by people who love you.
            </p>
            <p data-reveal>
              It is not one family&apos;s voice anymore. Teachers, financial educators, and writers
              who have spent their careers explaining hard things to young adults have shaped every
              unit here. They argue about the wording, cut the jargon, and refuse to publish
              anything they would not hand to their own students.
            </p>
            <p data-reveal>
              Because it was never only about three daughters. Everyone graduates into this, and
              almost nobody is handed the manual. So the letter became a school: open to anyone who
              wants it, free for as long as we can keep it that way, and taught with the same care
              it was written with.
            </p>
            <p data-reveal className="founder-line">
              A love letter to three daughters, and to every young mind coming up behind them.
            </p>
            <p data-reveal className="founder-sign">
              Neil and Archana Kadakia · Founders, and the educators who built this with them
            </p>
          </div>
        </div>
      </section>

      <section className="about-cta">
        <h2 data-reveal className="h2 h2--about-cta">
          Class starts whenever
          <br />
          you do.
        </h2>
        <div data-reveal className="enroll-ctas">
          <Link href="/demo/lesson" className="btn btn--ink">
            Try the Demo Lesson
          </Link>
          <Link href="/#newsletter" className="btn btn--ink">
            Join the Waitlist
          </Link>
        </div>
      </section>
    </div>
  );
}
