"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Wordmark from "./Wordmark";
import { handleAnchorClick } from "@/lib/anchor";
import { readSurface, scrollProgress, type SurfaceMode } from "@/lib/surface";
import { useLms } from "./useLms";

const LINKS = [
  { href: "/#syllabus", label: "Syllabus" },
  { href: "/#grades", label: "The Grades" },
  { href: "/#how", label: "How It Works" },
  { href: "/#book", label: "The Book" },
  { href: "/#faq", label: "FAQ" },
];

export default function Nav() {
  const pathname = usePathname();
  const isAbout = pathname === "/about";
  const inClassroom = pathname.startsWith("/learn");
  const [scrolled, setScrolled] = useState(false);
  const [surface, setSurface] = useState<SurfaceMode>("dark");
  const barRef = useRef<HTMLElement>(null);
  // The rule shows its full length on arrival and only becomes a gauge once
  // the reader actually starts moving. Once handed over, it stays a gauge.
  const ruleLive = useRef(false);
  const fromFull = useRef(false);
  const [open, setOpen] = useState(false);
  // Signed-in students get "Classroom"; everyone else gets Log In + Enroll.
  const { auth, loaded } = useLms();
  const student = loaded ? auth : null;

  // One read per frame at most, and all three answers come from it, so the
  // skin, the ink and the rule can never disagree about where the page is.
  //
  // The tint and the progress are written straight to the element as custom
  // properties. They change on every frame of a scroll, and putting either in
  // React state would re-render the whole bar sixty times a second to move a
  // dash offset.
  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const bar = barRef.current;
      if (!bar) return;
      setScrolled(window.scrollY > 64);

      const r = bar.getBoundingClientRect();
      const s = readSurface(Math.round(r.top + r.height / 2));
      setSurface(s.mode);
      bar.style.setProperty("--nav-tint", s.tint);

      // The rule is drawn in full when the page is first opened, so the mark
      // arrives complete rather than as a stub of itself. The moment the
      // reader scrolls it retracts to the gauge and tracks from then on, even
      // if they come back to the top.
      if (!ruleLive.current) {
        if (window.scrollY <= 0) {
          fromFull.current = true;
          bar.style.setProperty("--wm-progress", "1");
          return;
        }
        ruleLive.current = true;
        // Only worth easing when it is actually leaving the full state; a
        // reload part-way down the page should just start where it is.
        if (fromFull.current) {
          bar.classList.add("is-settling");
          window.setTimeout(() => bar.classList.remove("is-settling"), 640);
        }
      }
      // Never fully undrawn: at the top the rule is still a short amber tick,
      // which reads as the mark rather than as an empty track.
      bar.style.setProperty("--wm-progress", String(0.12 + scrollProgress() * 0.88));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname]);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);

  // Same-page section links scroll themselves. Left to the router they miss
  // when the hash is already in the URL, and land under the nav bar when it is
  // not. Cross-page links fall through to a normal navigation.
  const jump = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (handleAnchorClick(e, href, pathname)) close();
  };

  // The classroom has its own shell. The marketing nav stays out of it.
  if (inClassroom) return null;

  return (
    <>
      {/* Sibling of the header, not a child: the nav's backdrop-filter creates
          a containing block that would trap this fixed overlay inside the bar. */}
      <div
        id="mobile-menu"
        className={open ? "nav-overlay nav-overlay--open" : "nav-overlay"}
        inert={!open}
      >
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={(e) => {
              close();
              handleAnchorClick(e, link.href, pathname);
            }}
          >
            {link.label}
          </Link>
        ))}
        <Link href="/about" onClick={close}>
          About
        </Link>
        {student ? (
          <Link href="/learn" className="nav-overlay-cta" onClick={close}>
            Classroom
          </Link>
        ) : (
          <>
            <Link href="/demo/lesson" onClick={close}>
              Demo Lesson
            </Link>
            <Link href="/learn" onClick={close}>
              Log In
            </Link>
            <Link
              href="/#newsletter"
              className="nav-overlay-cta"
              onClick={(e) => {
                close();
                handleAnchorClick(e, "/#newsletter", pathname);
              }}
            >
              Join the Waitlist
            </Link>
          </>
        )}
      </div>
      <header
        ref={barRef}
        className={`nav${scrolled ? " nav--scrolled" : ""} nav--on-${surface}`}
      >
        {/* The bar is this inner element, not the header. At the top of the
            page it has no skin at all, so the hero's graph paper and the dome
            of light above it run to the edge of the screen uninterrupted; on
            scroll it takes on a background and becomes a capsule that rides
            down the page. The header only ever provides the inset. */}
        <div className="nav-inner">
      <Link href="/" className="nav-logo" onClick={close}>
        <Wordmark gid="dawn-nav" progress />
      </Link>
      <nav className="nav-links" aria-label="Main">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="nav-link"
            onClick={(e) => jump(e, link.href)}
          >
            {link.label}
          </Link>
        ))}
        <Link
          href="/about"
          className={isAbout ? "nav-link nav-link--active" : "nav-link"}
        >
          About
        </Link>
        {student ? (
          <Link href="/learn" className="nav-cta">
            Classroom
          </Link>
        ) : (
          <>
            <Link href="/learn" className="nav-link nav-link--login">
              Log In
            </Link>
            <Link
              href="/#newsletter"
              className="nav-cta"
              onClick={(e) => jump(e, "/#newsletter")}
            >
              Join the Waitlist
            </Link>
          </>
        )}
        <button
          type="button"
          className="nav-burger"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close Menu" : "Open Menu"}
          onClick={() => setOpen(!open)}
        >
          <span />
          <span />
          <span />
        </button>
      </nav>
        </div>
      </header>
    </>
  );
}
