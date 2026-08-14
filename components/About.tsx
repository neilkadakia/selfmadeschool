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
    body: "Not knowing was never your fault — nobody taught you. Every question here is a fair one, asked by thousands before you.",
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
        gsap.from("[data-wm]", { opacity: 0, x: 80, duration: 1.4, ease: "power2.out", delay: 0.3 });

        gsap.to("[data-wm]", {
          y: 140,
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
        <div data-wm aria-hidden="true" className="wm about-wm">
          SM
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
          Made School is the school for everything after the diploma — built for 18-to-30-year-olds who&apos;d rather
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
            Every year, millions of people graduate into the most consequential decade of their lives — first
            paychecks, first leases, first big calls — with zero formal preparation. We think that&apos;s absurd. So we
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
            There — we said it. Life doesn&apos;t grade essays; it hands you decisions. What adults
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

      <section className="note-section">
        <blockquote data-reveal className="quote">
          <p>&quot;We&apos;re not here to make you feel behind. We&apos;re here to make catching up feel easy.&quot;</p>
          <cite>— The Self Made School Team</cite>
        </blockquote>
      </section>

      <section className="about-cta">
        <h2 data-reveal className="h2 h2--about-cta">
          Class starts whenever
          <br />
          you do.
        </h2>
        <div data-reveal className="enroll-ctas">
          <Link href="/demo" className="btn btn--ink">
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
