"use client";

// The Walkthrough: the private guided demo at /demo.
//
// This file is the renderer only. Every word it displays arrives from
// api/demo.php after the server has checked the token and the role, so
// the static bundle carries the layout and none of the content.
//
// Reveals use an IntersectionObserver rather than the site's GSAP
// ScrollTrigger setup on purpose: the content arrives asynchronously, and
// an observer handles nodes that appear after mount without needing a
// refresh pass. Nothing is hidden until the observer is known to be
// running, so a JavaScript failure cannot leave the page blank.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLms } from "@/components/useLms";
import {
  apiDemoDoc,
  rankOf,
  ROLE_RANK,
  ROLE_LABEL,
  type DemoBlock,
  type DemoChapter,
  type DemoDoc,
  type Role,
} from "@/lib/api";

export default function DemoTour() {
  const { auth, loaded } = useLms();
  const [doc, setDoc] = useState<DemoDoc | null>(null);
  const [error, setError] = useState("");
  const [active, setActive] = useState("");
  const [progress, setProgress] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const token = auth?.token;
  const allowed = rankOf(auth?.role) >= ROLE_RANK.admin;

  /* Pull the document. The server is the real gate; the check above just
     avoids a pointless 403 round trip. */
  useEffect(() => {
    if (!token || !allowed) return;
    let alive = true;
    (async () => {
      const res = await apiDemoDoc(token);
      if (!alive) return;
      if (res.ok && res.data.ok) {
        setDoc(res.data as unknown as DemoDoc);
      } else {
        setError((res.data.error as string) || "Could not load the walkthrough.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, allowed]);

  /* Reveal on scroll, and track which chapter the rail should highlight. */
  useEffect(() => {
    if (!doc) return;
    const root = rootRef.current;
    if (!root) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    let cleanupIo: IntersectionObserver | undefined;

    if (reduce) {
      targets.forEach((el) => el.classList.add("is-in"));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("is-in");
              io.unobserve(e.target);
            }
          });
        },
        { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
      );
      targets.forEach((el) => io.observe(el));
      // Anything already on screen at mount should not wait for a scroll.
      requestAnimationFrame(() => {
        targets.forEach((el) => {
          if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("is-in");
        });
      });
      cleanupIo = io;
    }

    const sections = Array.from(root.querySelectorAll<HTMLElement>("[data-chapter]"));
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    sections.forEach((el) => spy.observe(el));

    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? Math.min(1, h.scrollTop / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cleanupIo?.disconnect();
      spy.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [doc]);

  if (!loaded) return <div className="tour" aria-busy="true" />;

  /* Signed in, but not faculty. The server would refuse anyway. */
  if (!allowed) {
    return (
      <div className="tour">
        <div className="tour-shell tour-msg">
          <p className="kicker kicker--acc">Restricted</p>
          <h1 className="tour-msg-h">This one is not for your account.</h1>
          <p className="tour-msg-p">
            The walkthrough is for administrators. You are signed in as{" "}
            {ROLE_LABEL[(auth?.role as Role) ?? "student"]}.
          </p>
          <Link href="/learn/" className="btn btn--solid">
            Go to the Classroom
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tour">
        <div className="tour-shell tour-msg">
          <p className="kicker kicker--acc">Trouble</p>
          <h1 className="tour-msg-h">{error}</h1>
          <p className="tour-msg-p">
            The walkthrough is served by the school API. If the server is
            unreachable, this page has nothing to show, which is the point of
            building it this way.
          </p>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="tour">
        <div className="tour-shell tour-msg" aria-busy="true">
          <p className="kicker kicker--acc">Loading</p>
          <h1 className="tour-msg-h">Fetching the walkthrough…</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="tour" ref={rootRef}>
      <div className="tour-progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>

      <header className="tour-cover">
        <div className="tour-shell">
          <p className="kicker kicker--acc" data-reveal>
            Private · Administrator Only · Updated {doc.updated}
          </p>
          <h1 className="tour-title" data-reveal>
            {doc.title}
            <span className="dot">.</span>
          </h1>
          <p className="tour-subtitle" data-reveal>
            {doc.subtitle}
          </p>
          <div className="tour-meta" data-reveal>
            <span>
              Signed in as <strong>{auth?.name || auth?.email}</strong>
            </span>
            <span className="tour-meta-dot" aria-hidden="true">
              ·
            </span>
            <span>{ROLE_LABEL[(auth?.role as Role) ?? "student"]}</span>
            <span className="tour-meta-dot" aria-hidden="true">
              ·
            </span>
            <span>{doc.chapters.length} chapters</span>
          </div>
        </div>
      </header>

      <div className="tour-body">
        <nav className="tour-rail" aria-label="Chapters">
          <p className="tour-rail-h">Chapters</p>
          <ol>
            {doc.chapters.map((c) => (
              <li key={c.id}>
                <a
                  href={`#${c.id}`}
                  className={active === c.id ? "tour-rail-on" : undefined}
                >
                  <span className="tour-rail-num">{c.num}</span>
                  <span className="tour-rail-label">{c.label}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="tour-chapters">
          {doc.chapters.map((c) => (
            <Chapter key={c.id} chapter={c} />
          ))}

          <footer className="tour-end" data-reveal>
            <p className="kicker kicker--acc">End of Walkthrough</p>
            <h2 className="tour-end-h">That is the whole thing.</h2>
            <p className="tour-msg-p">
              Sign out and this page stops existing for anyone who has the link.
            </p>
            <div className="tour-end-ctas">
              <a href="#problem" className="btn btn--outline">
                Back to the Top
              </a>
              <Link href="/learn/" className="btn btn--solid">
                Go to the Classroom
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Chapter({ chapter }: { chapter: DemoChapter }) {
  return (
    <section id={chapter.id} data-chapter className="tour-chapter">
      <header className="tour-chapter-head" data-reveal>
        <span className="tour-chapter-num" aria-hidden="true">
          {chapter.num}
        </span>
        <p className="kicker kicker--acc">{chapter.kicker}</p>
        <h2 className="tour-chapter-h">{chapter.title}</h2>
        <p className="tour-chapter-lede">{chapter.lede}</p>
      </header>
      {chapter.blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </section>
  );
}

function Block({ block }: { block: DemoBlock }) {
  switch (block.type) {
    case "text":
      return (
        <p className="tour-text" data-reveal>
          {block.body}
        </p>
      );

    case "note":
      return (
        <aside className="tour-note" data-reveal>
          <p>{block.body}</p>
        </aside>
      );

    case "list":
      return (
        <div className="tour-list" data-reveal>
          {block.title && <h3 className="tour-block-h">{block.title}</h3>}
          <ul>
            {block.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      );

    case "stats":
      return (
        <div className="tour-stats" data-reveal>
          {block.items.map((s, i) => (
            <div key={i} className="tour-stat">
              <span className="tour-stat-value">{s.value}</span>
              <span className="tour-stat-label">{s.label}</span>
              {s.note && <span className="tour-stat-note">{s.note}</span>}
            </div>
          ))}
        </div>
      );

    case "cards":
      return (
        <div className="tour-cards" data-reveal>
          {block.items.map((c, i) => (
            <article key={i} className={`tour-card tour-card--${c.tone ?? "acc"}`}>
              <h3 className="tour-card-h">{c.title}</h3>
              <p className="tour-card-p">{c.body}</p>
            </article>
          ))}
        </div>
      );

    case "live":
      return (
        <div className="tour-live" data-reveal>
          {block.title && <h3 className="tour-block-h">{block.title}</h3>}
          <div className="tour-live-grid">
            {block.items.map((l, i) => (
              <a
                key={i}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="tour-live-card"
              >
                <span className="tour-live-tag">Live</span>
                <span className="tour-live-h">{l.title}</span>
                <span className="tour-live-p">{l.body}</span>
                <span className="tour-live-cta">{l.cta} →</span>
              </a>
            ))}
          </div>
        </div>
      );

    case "table":
      return (
        <div className="tour-table-wrap" data-reveal>
          <table className="tour-table">
            <thead>
              <tr>
                {block.head.map((h, i) => (
                  <th key={i} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) =>
                    j === 0 ? (
                      <th key={j} scope="row">
                        {cell}
                      </th>
                    ) : (
                      <td key={j}>{cell}</td>
                    )
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    default:
      return null;
  }
}
