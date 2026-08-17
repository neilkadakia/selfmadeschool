"use client";

// Somebody on staff pointed you at something.
//
// Not a task list. It is one person saying "start here, and this is why",
// with their name on it, so it reads like a note passed across a desk
// rather than a ticket assigned to you. Nothing appears here unless a
// teacher put it there by hand.
//
// A due date only shows when the school runs on deadlines. Off, this is an
// invitation and there is no clock anywhere on it.

import Link from "next/link";
import { usDate } from "@/lib/format";
import { useSchool } from "./useSchool";

export default function Assigned() {
  const school = useSchool();
  const open = school.assignments.filter((a) => !a.done);
  if (!school.loaded || open.length === 0) return null;

  return (
    <section className="lms-assigned">
      <p className="lms-assigned-kicker">
        {open.length === 1 ? "A teacher pointed you at this" : "Your teachers pointed you at these"}
      </p>
      {open.map((a) => {
        const href = a.unit ? `/learn/${a.course}/${a.unit}/` : `/learn/${a.course}/`;
        return (
          <article key={a.id} className="lms-assigned-row">
            <div className="lms-assigned-main">
              <Link href={href} className="lms-assigned-title">
                {a.unitTitle || a.courseTitle}
              </Link>
              {a.note && <p className="lms-assigned-note">&quot;{a.note}&quot;</p>}
              <p className="lms-assigned-by">
                {a.byName}
                {a.due && (
                  <>
                    {" · "}
                    <span className={a.overdue ? "lms-assigned-late" : ""}>
                      {a.overdue ? "was due " : "by "}
                      {usDate(a.due)}
                    </span>
                  </>
                )}
              </p>
            </div>
            <div className="lms-assigned-actions">
              <Link href={href} className="btn btn--ink lms-assigned-go">
                Open It
              </Link>
              <button
                className="lms-assigned-done"
                onClick={() => void school.closeAssignment(a.id, true)}
              >
                Mark Done
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}
