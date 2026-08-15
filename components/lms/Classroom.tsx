"use client";

// The classroom shell: a persistent left sidebar for every signed-in
// /learn page: wordmark, section nav, course list with live progress,
// account row. The unit player keeps its own immersive layout (it has
// a lesson sidebar of its own), and signed-out visitors just get the
// gate, full width.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { COURSES, levelFor } from "@/lib/lms";
import { isFaculty } from "@/lib/api";
import { useLms, courseProgress } from "@/components/useLms";
import Portrait from "@/components/lms/Portrait";
import Wordmark from "@/components/Wordmark";

const ROOMS = [
  { href: "/learn", label: "My Desk", exact: true },
  { href: "/learn/review", label: "Study Hall", exact: false },
  { href: "/learn/arena", label: "The Arena", exact: false },
  { href: "/learn/certificate", label: "Certificates", exact: false },
];

export default function Classroom({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lms = useLms();

  // /learn/[course]/[unit] is the player: three segments, minus the
  // named depth-2 rooms which can never collide with a course slug.
  const segs = pathname.split("/").filter(Boolean);
  const isPlayer = segs.length === 3;

  // On phones the sidebar is a horizontal scroll bar. Keep the active
  // room visible. block: "nearest" makes this a no-op vertically. The
  // ready flag matters: on first load the shell mounts only after auth
  // loads, without a pathname change.
  const ready = lms.loaded && Boolean(lms.auth);
  useEffect(() => {
    document
      .querySelector(".classroom-side .is-here")
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname, ready]);

  // While Acting As someone, a banner rides above everything (the
  // player included) so nobody forgets whose account they're driving.
  const banner =
    lms.actor && lms.auth ? (
      <div className="lms-actas-bar" role="status">
        <span className="lms-actas-text">
          Acting as <strong>{lms.auth.name || lms.auth.email}</strong>. Everything you do lands
          on their account.
        </span>
        <button className="lms-actas-return" onClick={() => lms.returnToSelf()}>
          Return to Your Account
        </button>
      </div>
    ) : null;

  if (isPlayer || !lms.loaded || !lms.auth) {
    return (
      <>
        {banner}
        {children}
      </>
    );
  }

  const level = levelFor(lms.state.xp);
  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href || pathname === `${href}/` : pathname.startsWith(href);

  return (
    <>
      {banner}
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
            href="/learn/locker"
            className={`classroom-link${isActive("/learn/locker", false) ? " is-here" : ""}`}
          >
            The Locker
            {lms.state.credits > 0 && (
              <span className="classroom-course-pct">{lms.state.credits} Cr</span>
            )}
          </Link>
          <Link
            href="/learn/profile"
            className={`classroom-link${isActive("/learn/profile", false) ? " is-here" : ""}`}
          >
            Student File
          </Link>
          {isFaculty(lms.auth.role) && (
            <Link
              href="/learn/admin"
              className={`classroom-link${isActive("/learn/admin", false) ? " is-here" : ""}`}
            >
              Faculty Lounge
            </Link>
          )}
        </nav>
        <div className="classroom-user">
          <Link href="/learn/profile" className="classroom-user-id" title="Your Student File">
            {lms.state.avatar.created ? (
              <span className="classroom-avatar classroom-avatar--live" aria-hidden="true">
                <Portrait avatar={lms.state.avatar} equipped={lms.state.equipped} size={40} />
              </span>
            ) : (
              <span className="lms-avatar classroom-avatar" aria-hidden="true">
                {(lms.auth.name || lms.auth.email).slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="classroom-user-main">
              <span className="classroom-user-name">{lms.auth.name || lms.auth.email}</span>
              <span className="classroom-user-sub">
                {lms.sync === "saving"
                  ? "Saving…"
                  : lms.sync === "error"
                    ? "Offline · saved here"
                    : level.name}
              </span>
            </span>
          </Link>
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
    </>
  );
}
