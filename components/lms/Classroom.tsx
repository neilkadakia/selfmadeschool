"use client";

// The classroom shell: a persistent left sidebar for every signed-in
// /learn page — wordmark, section nav, course list with live progress,
// account row. The unit player keeps its own immersive layout (it has
// a lesson sidebar of its own), and signed-out visitors just get the
// gate, full width.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COURSES, levelFor } from "@/lib/lms";
import { useLms, courseProgress } from "@/components/useLms";
import Wordmark from "@/components/Wordmark";

const ROOMS = [
  { href: "/learn", label: "My Desk", exact: true },
  { href: "/learn/review", label: "Study Hall", exact: false },
  { href: "/learn/certificate", label: "Certificates", exact: false },
];

export default function Classroom({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lms = useLms();

  // /learn/[course]/[unit] is the player — three segments, minus the
  // named depth-2 rooms which can never collide with a course slug.
  const segs = pathname.split("/").filter(Boolean);
  const isPlayer = segs.length === 3;

  if (isPlayer || !lms.loaded || !lms.auth) return <>{children}</>;

  const level = levelFor(lms.state.xp);
  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href || pathname === `${href}/` : pathname.startsWith(href);

  return (
    <div className="classroom">
      <aside className="classroom-side">
        <Link href="/learn" className="classroom-brand">
          <Wordmark gid="dawn-classroom" />
        </Link>
        <nav className="classroom-nav" aria-label="Classroom">
          <span className="classroom-label">My Learning</span>
          {ROOMS.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className={`classroom-link${isActive(r.href, r.exact) ? " is-here" : ""}`}
            >
              {r.label}
            </Link>
          ))}
          <span className="classroom-label">Courses</span>
          {COURSES.map((c) => {
            const p = courseProgress(lms.state, c.slug);
            return (
              <Link
                key={c.slug}
                href={`/learn/${c.slug}`}
                className={`classroom-link classroom-course${
                  isActive(`/learn/${c.slug}`, false) ? " is-here" : ""
                }`}
              >
                <span className={`classroom-gradenum tone-${c.tone}`}>
                  {c.title.replace(/\D/g, "")}
                </span>
                <span className="classroom-course-name">{c.title}</span>
                <span className="classroom-course-pct">
                  {c.status === "preview" ? "demo" : `${p.done}/${p.total}`}
                </span>
              </Link>
            );
          })}
          <span className="classroom-label">Account</span>
          <Link
            href="/learn/profile"
            className={`classroom-link${isActive("/learn/profile", false) ? " is-here" : ""}`}
          >
            Student File
          </Link>
          {lms.auth.role === "admin" && (
            <Link
              href="/learn/admin"
              className={`classroom-link${isActive("/learn/admin", false) ? " is-here" : ""}`}
            >
              Faculty Lounge
            </Link>
          )}
        </nav>
        <div className="classroom-user">
          <span className="lms-avatar classroom-avatar" aria-hidden="true">
            {(lms.auth.name || lms.auth.email).slice(0, 1).toUpperCase()}
          </span>
          <span className="classroom-user-main">
            <span className="classroom-user-name">{lms.auth.name || lms.auth.email}</span>
            <span className="classroom-user-sub">
              {lms.sync === "saving"
                ? "Saving…"
                : lms.sync === "error"
                  ? "Offline — saved here"
                  : level.name}
            </span>
          </span>
          <button className="lms-signout classroom-signout" onClick={() => lms.logout()}>
            Sign Out
          </button>
        </div>
        <Link href="/" className="classroom-exit">
          ← Back to the Website
        </Link>
      </aside>
      <div className="classroom-main">{children}</div>
    </div>
  );
}
