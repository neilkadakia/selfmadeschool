"use client";

// Print-ready certificate for any 100% completed course.
// The page is the certificate — the print button just calls window.print().

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { COURSES } from "@/lib/lms";
import { useLms, courseProgress } from "@/components/useLms";
import Wordmark from "@/components/Wordmark";

export default function Certificate() {
  const lms = useLms();
  const { state, loaded } = lms;
  const params = useSearchParams();
  // Stored name until the user starts typing, then their edit takes over.
  const [edited, setEdited] = useState<string | null>(null);
  const name = edited ?? state.name;

  const completed = COURSES.filter((c) => courseProgress(state, c.slug).pct === 100);
  const requested = params.get("course");
  const course = completed.find((c) => c.slug === requested) ?? completed[0];

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (!loaded) {
    return (
      <div className="learn">
        <div className="learn-wrap" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="learn">
        <div className="learn-wrap">
          <Link href="/learn" className="crumb">
            ← My Learning
          </Link>
          <p className="kicker kicker--acc">Certificate</p>
          <h1 className="learn-h1">Not yet.</h1>
          <p className="learn-sub">
            The certificate unlocks when you finish every unit in a course. No shortcuts — that&apos;s
            what makes it worth printing.
          </p>
          <Link href="/learn" className="btn btn--solid">
            Back to Class →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="learn lms-cert-page">
      <div className="learn-wrap">
        <div className="lms-cert-controls">
          <Link href={`/learn/${course.slug}`} className="crumb">
            ← {course.title}
          </Link>
          <h1 className="lms-section-h">Your certificate</h1>
          <p className="lms-section-sub">
            Put your name on it, then print it or save it as a PDF. It&apos;s tied to your account,
            earned the only way possible — by finishing.
          </p>
          <input
            className="lms-cert-name"
            placeholder="Your name, as it should appear"
            value={name}
            onChange={(e) => setEdited(e.target.value)}
            onBlur={() => lms.setName(name)}
            maxLength={60}
          />
          <button
            className="btn btn--solid"
            onClick={() => {
              lms.setName(name);
              window.print();
            }}
          >
            Print / Save as PDF
          </button>
        </div>

        <div className="lms-cert" id="certificate">
          <div className="lms-cert-inner">
            <div className="lms-cert-brand">
              <Wordmark gid="cert" />
            </div>
            <p className="lms-cert-label">Certificate of Completion</p>
            <p className="lms-cert-name-line">{name.trim() || "Your Name Here"}</p>
            <p className="lms-cert-text">
              completed all {course.parts.reduce((a, p) => a + p.units.length, 0)} units of
            </p>
            <p className="lms-cert-course">{course.title}</p>
            <p className="lms-cert-text lms-cert-sub">{course.headline}</p>
            <div className="lms-cert-foot">
              <span>{today}</span>
              <span className="lms-cert-sweep" aria-hidden="true" />
              <span>selfmadeschool.org</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
