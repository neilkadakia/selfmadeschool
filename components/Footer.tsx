"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { handleAnchorClick } from "@/lib/anchor";
import { PEP_LINES, pepForDay } from "@/lib/encouragement";
import Wordmark from "./Wordmark";

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
  // Prerendered pages ship line one; the day's line lands after mount.
  const [pep, setPep] = useState(PEP_LINES[0]);
  useEffect(() => setPep(pepForDay()), []);

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
      <span>© 2026 Self Made School. Not actual financial advice. Actual life advice.</span>
    </footer>
  );
}
