"use client";

// The door, when a course is not open to you yet.
//
// Two reasons it can be shut: the school is charging and this one is not
// yours, or the school runs its courses in order and the one before this is
// unfinished. Either way it names the way in rather than just refusing, and
// it never pretends the work you already did has gone anywhere.

import Link from "next/link";
import { getCourse } from "@/lib/lms";
import { money } from "@/lib/faculty";

export default function CourseLock({
  slug,
  needs,
  after,
}: {
  slug: string;
  needs: { name: string; price: number; cadence: string } | null;
  after?: { slug: string; title: string } | null;
}) {
  const course = getCourse(slug);

  // Order comes first: telling somebody the price of a door they cannot
  // open yet for a different reason is just noise.
  if (after) {
    return (
      <div className="learn">
        <div className="learn-wrap lms-gate">
          <Link href="/learn" className="crumb">
            ← My Learning
          </Link>
          <p className={`kicker kicker--${course?.tone ?? "acc"}`}>{course?.kicker ?? "Course"}</p>
          <h1 className="learn-h1">Finish {after.title} first.</h1>
          <p className="learn-sub">
            The school runs these in order, because {course?.title ?? "this course"} is built on
            what {after.title} teaches. Finish it and this opens on its own. Nothing here expires
            and nothing you have already done is lost.
          </p>
          <Link href={`/learn/${after.slug}`} className="btn btn--solid">
            Back to {after.title} →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="learn">
      <div className="learn-wrap lms-gate">
        <Link href="/learn" className="crumb">
          ← My Learning
        </Link>
        <p className={`kicker kicker--${course?.tone ?? "acc"}`}>{course?.kicker ?? "Course"}</p>
        <h1 className="learn-h1">{course?.title ?? "This course"} is not open to you yet.</h1>
        {needs ? (
          <p className="learn-sub">
            It comes with <strong>{needs.name}</strong>
            {needs.price > 0 && (
              <>
                {" "}
                at {money(needs.price)}
                {needs.cadence === "month" ? " a month" : needs.cadence === "year" ? " a year" : ""}
              </>
            )}
            . The front office can open it for you today: email the school and somebody will sort it
            out. Everything you have already finished stays exactly where it is.
          </p>
        ) : (
          <p className="learn-sub">
            Nothing sells this course yet. It is being written. Your place in the courses you are
            already in has not changed.
          </p>
        )}
        <Link href="/learn" className="btn btn--solid">
          Back to My Learning
        </Link>
      </div>
    </div>
  );
}
