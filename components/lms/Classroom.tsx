"use client";

// The classroom shell: a persistent left sidebar for every signed-in
// /learn page: wordmark, section nav, course list with live progress,
// account row. The unit player keeps its own immersive layout (it has
// a lesson sidebar of its own), and signed-out visitors just get the
// gate, full width.
//
// Under /learn/faculty the same sidebar swaps its middle section for the
// faculty rooms. It reads as stepping into a different room of the same
// building rather than a second application, and there is one exit back
// to your own classroom at the top of the list.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { COURSES, levelFor } from "@/lib/lms";
import { ROLE_LABEL, ROLE_RANK, isFaculty, rankOf } from "@/lib/api";
import { useLms, courseProgress } from "@/components/useLms";
import Portrait from "@/components/lms/Portrait";
import Wordmark from "@/components/Wordmark";

const ROOMS = [
  { href: "/learn", label: "My Desk", exact: true },
  { href: "/learn/review", label: "Study Hall", exact: false },
  { href: "/learn/arena", label: "The Arena", exact: false },
  { href: "/learn/certificate", label: "Certificates", exact: false },
];

// The lounge, in the order a teacher's day runs. `min` is the rank that
// sees the entry; the server checks it again on every call.
const FACULTY_ROOMS = [
  { href: "/learn/faculty", label: "Front Desk", exact: true, min: ROLE_RANK.educator },
  { href: "/learn/faculty/gradebook", label: "Gradebook", exact: false, min: ROLE_RANK.educator },
  { href: "/learn/faculty/fieldwork", label: "Field Work", exact: false, min: ROLE_RANK.educator },
  { href: "/learn/faculty/discussion", label: "Study Group", exact: false, min: ROLE_RANK.educator },
  { href: "/learn/faculty/bulletin", label: "The Bulletin", exact: false, min: ROLE_RANK.educator },
  { href: "/learn/faculty/studio", label: "The Studio", exact: false, min: ROLE_RANK.educator },
  { href: "/learn/faculty/records", label: "Records", exact: false, min: ROLE_RANK.educator },
  { href: "/learn/faculty/people", label: "Front Office", exact: false, min: ROLE_RANK.admin },
  { href: "/learn/faculty/enrollment", label: "Enrollment", exact: false, min: ROLE_RANK.admin },
  { href: "/learn/faculty/ops", label: "School Ops", exact: false, min: ROLE_RANK.global_admin },
];

export default function Classroom({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lms = useLms();

  // /learn/[course]/[unit] is the player, and only that. Testing the
  // course slug rather than counting segments matters now that the
  // faculty rooms are three deep too.
  const segs = pathname.split("/").filter(Boolean);
  const isPlayer = segs.length === 3 && COURSES.some((c) => c.slug === segs[1]);
  const inLounge = segs[1] === "faculty";

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
  // Captured out here: the early return above proves it is set, but that
  // does not survive into the callbacks below.
  const myRank = rankOf(lms.auth.role);
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
        <nav className="classroom-nav" aria-label={inLounge ? "Faculty Lounge" : "Classroom"}>
          {inLounge ? (
            <>
              <Link href="/learn" className="classroom-link">
                ← My Learning
              </Link>
              <span className="classroom-label">Faculty Lounge</span>
              {FACULTY_ROOMS.filter((r) => myRank >= r.min).map((r) => (
                <Link
                  key={r.href}
                  href={r.href}
                  className={`classroom-link${isActive(r.href, r.exact) ? " is-here" : ""}`}
                >
                  {r.label}
                </Link>
              ))}
            </>
          ) : (
            <>
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
            <Link href="/learn/faculty" className="classroom-link">
              Faculty Lounge →
            </Link>
          )}
            </>
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
                    : // In the lounge you are staff, not a student on the
                      // level ladder. Show the job instead.
                      inLounge
                      ? ROLE_LABEL[lms.auth.role]
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
