"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/#syllabus", label: "Syllabus" },
  { href: "/#grades", label: "The Grades" },
  { href: "/#how", label: "How It Works" },
  { href: "/#receipts", label: "Receipts" },
  { href: "/#book", label: "The Book" },
];

export default function Nav() {
  const isAbout = usePathname() === "/about";

  return (
    <div className="nav">
      <Link href="/" className="nav-logo">
        <span className="nav-badge">SM</span>
        <span>SELF MADE SCHOOL</span>
      </Link>
      <nav className="nav-links">
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
        <Link href="/#enroll" className="nav-cta">
          Enroll Free
        </Link>
      </nav>
    </div>
  );
}
