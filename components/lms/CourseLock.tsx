"use client";

// The door, when the school is charging and this course is not yours.
//
// It names the way in rather than just refusing, and it never pretends the
// work you already did has gone anywhere. Shown only when payment is on:
// while the school is free this component is never rendered at all.

import Link from "next/link";
import { getCourse } from "@/lib/lms";
import { money } from "@/lib/faculty";

export default function CourseLock({
  slug,
  needs,
}: {
  slug: string;
  needs: { name: string; price: number; cadence: string } | null;
}) {
  const course = getCourse(slug);
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
