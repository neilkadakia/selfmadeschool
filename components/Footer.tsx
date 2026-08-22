"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { handleAnchorClick } from "@/lib/anchor";
import { usePepLine } from "@/lib/encouragement";
import Wordmark from "./Wordmark";

// The school's own accounts. Outward links, so they open in a new tab and
// carry rel="noopener"; the icons are line drawings like everywhere else in
// this project, never a brand emoji or a bitmap.
const SOCIAL = [
  {
    href: "https://www.instagram.com/official.selfmadeschool/",
    label: "Instagram",
    handle: "official.selfmadeschool",
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    href: "https://www.youtube.com/@official.selfmadeschool.com",
    label: "YouTube",
    handle: "@official.selfmadeschool.com",
    icon: (
      <>
        <rect x="2.5" y="5" width="19" height="14" rx="4" />
        <path d="M10.5 9.2v5.6l4.6-2.8z" fill="currentColor" stroke="none" />
      </>
    ),
  },
];

const FOOTER_LINKS = [
  { href: "/#syllabus", label: "Syllabus" },
  { href: "/#how", label: "How It Works" },
  { href: "/#book", label: "The Book" },
  { href: "/demo/lesson", label: "Demo Lesson" },
  { href: "/about", label: "About" },
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
        {SOCIAL.map((sm) => (
          <a
            key={sm.href}
            href={sm.href}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-social-link"
            aria-label={`Self Made School on ${sm.label}, ${sm.handle}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              {sm.icon}
            </svg>
            <span>{sm.label}</span>
          </a>
        ))}
      </div>
      <span>© 2026 Self Made School. Not actual financial advice. Actual life advice.</span>
    </footer>
  );
}
