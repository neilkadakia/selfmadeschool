"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Wordmark from "./Wordmark";

export default function Footer() {
  // The classroom has its own shell. The marketing footer stays out of it.
  if (usePathname().startsWith("/learn")) return null;

  return (
    <footer className="footer">
      <span className="footer-logo">
        <Wordmark gid="dawn-footer" />
      </span>
      <div className="footer-links">
        <Link href="/#syllabus">Syllabus</Link>
        <Link href="/#how">How It Works</Link>
        <Link href="/#book">The Book</Link>
        <Link href="/demo/lesson">Demo Lesson</Link>
        <Link href="/about">About</Link>
        <Link href="/#newsletter">Waitlist</Link>
        <Link href="/learn">Sign In</Link>
        <Link href="/privacy">Privacy</Link>
      </div>
      <span>© 2026 Self Made School. Not actual financial advice. Actual life advice.</span>
    </footer>
  );
}
