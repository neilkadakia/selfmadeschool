"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Wordmark from "./Wordmark";
import { handleAnchorClick } from "@/lib/anchor";
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
  const [open, setOpen] = useState(false);
  // Signed-in students get "Classroom"; everyone else gets Log In + Enroll.
  const { auth, loaded } = useLms();
  const student = loaded ? auth : null;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 64);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      <header className={scrolled ? "nav nav--scrolled" : "nav"}>
        {/* The bar is this inner element, not the header. At the top of the
            page it has no skin at all, so the hero's graph paper and the dome
            of light above it run to the edge of the screen uninterrupted; on
            scroll it takes on a background and becomes a capsule that rides
            down the page. The header only ever provides the inset. */}
        <div className="nav-inner">
      <Link href="/" className="nav-logo" onClick={close}>
        <Wordmark gid="dawn-nav" />
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
