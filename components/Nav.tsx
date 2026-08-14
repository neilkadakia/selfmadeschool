"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Wordmark from "./Wordmark";
import { useLms } from "./useLms";

const LINKS = [
  { href: "/#syllabus", label: "Syllabus" },
  { href: "/#grades", label: "The Grades" },
  { href: "/#how", label: "How It Works" },
  { href: "/#book", label: "The Book" },
  { href: "/#faq", label: "FAQ" },
];

export default function Nav() {
  const isAbout = usePathname() === "/about";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  // Signed-in students get "Classroom"; everyone else gets Log In + Enroll.
  const { auth, loaded } = useLms();
  const student = loaded ? auth : null;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
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
          <Link key={link.href} href={link.href} onClick={close}>
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
            <Link href="/learn" onClick={close}>
              Log In
            </Link>
            <Link href="/#enroll" className="nav-overlay-cta" onClick={close}>
              Enroll Free
            </Link>
          </>
        )}
      </div>
      <header className={scrolled ? "nav nav--scrolled" : "nav"}>
      <Link href="/" className="nav-logo" onClick={close}>
        <Wordmark gid="dawn-nav" />
      </Link>
      <nav className="nav-links" aria-label="Main">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="nav-link">
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
            <Link href="/#enroll" className="nav-cta">
              Enroll Free
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
      </header>
    </>
  );
}
