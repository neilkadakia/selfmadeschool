"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { handleAnchorClick } from "@/lib/anchor";
import { usePepLine } from "@/lib/encouragement";
import Wordmark from "./Wordmark";

// The school's own accounts. The standard brand marks, because a social icon
// is one of the few places where inventing your own drawing costs you: people
// find these by shape, not by reading. Drawn as solid buttons rather than dim
// glyphs in the link row, where the first version of this was unfindable.
const SOCIAL = [
  {
    href: "https://www.instagram.com/official.selfmadeschool/",
    label: "Instagram",
    handle: "official.selfmadeschool",
    icon: (
      <g fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="2.6" y="2.6" width="18.8" height="18.8" rx="5.4" />
        <circle cx="12" cy="12" r="4.6" />
        <circle cx="17.5" cy="6.5" r="1.25" fill="currentColor" stroke="none" />
      </g>
    ),
  },
  {
    href: "https://www.youtube.com/@official.selfmadeschool.com",
    label: "YouTube",
    handle: "@official.selfmadeschool.com",
    // One path, even-odd wound, so the play triangle is a hole rather than a
    // shape painted in the background colour. That keeps it correct on hover,
    // when the button behind it changes colour.
    icon: (
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        d="M22.6 7.3a3 3 0 0 0-2.1-2.1C18.6 4.6 12 4.6 12 4.6s-6.6 0-8.5.6A3 3 0 0 0 1.4 7.3 31 31 0 0 0 .8 12a31 31 0 0 0 .6 4.7 3 3 0 0 0 2.1 2.1c1.9.6 8.5.6 8.5.6s6.6 0 8.5-.6a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .6-4.7 31 31 0 0 0-.6-4.7ZM9.9 15.4V8.6l5.9 3.4-5.9 3.4Z"
      />
    ),
  },
];

// Only what the top nav does not already carry. The nav follows you down the
// page now, so repeating Syllabus, How It Works, The Book, Demo Lesson and
// About down here bought nothing except a crowded bottom edge.
const FOOTER_LINKS = [
  { href: "/#newsletter", label: "Waitlist" },
  { href: "/learn", label: "Sign In" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms of Use" },
];

export default function Footer() {
  const pathname = usePathname();
  const pep = usePepLine();

  // The classroom has its own shell. The marketing footer stays out of it.
  if (pathname.startsWith("/learn")) return null;

  return (
    <footer className="footer">
      {/* One page carries the encouragement line: About, where somebody is
          already reading about why the school exists. */}
      {pathname === "/about" && <p className="footer-cheer">{pep}</p>}
      <span className="footer-logo">
        <Wordmark gid="dawn-footer" />
      </span>
      <div className="footer-links">
        {FOOTER_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={(e) => handleAnchorClick(e, l.href, pathname)}
          >
            {l.label}
          </Link>
        ))}
      </div>
      <div className="footer-social">
        <span className="footer-social-label">Follow</span>
        {SOCIAL.map((sm) => (
          <a
            key={sm.href}
            href={sm.href}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-social-link"
            aria-label={`Self Made School on ${sm.label}, ${sm.handle}`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">{sm.icon}</svg>
          </a>
        ))}
      </div>
      <span>© 2026 Self Made School. Not actual financial advice. Actual life advice.</span>
    </footer>
  );
}
