"use client";

// Print-ready certificate for any 100% completed course, and the Diploma,
// which unlocks when every unit is complete and every Final is passed.
// The page is the certificate; the print button just calls window.print().
// When the Registrar (finals.php) confirms a passing record server-side,
// the certificate carries a verification line the browser can't self-award.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { COURSES } from "@/lib/lms";
import { apiFinalStatus, type FinalRecord } from "@/lib/api";
import { useLms, courseProgress } from "@/components/useLms";
import Wordmark from "@/components/Wordmark";

export default function Certificate() {
  const lms = useLms();
  const { state, loaded } = lms;
  const params = useSearchParams();
  const token = lms.auth?.token ?? "";
  // Stored name until the user starts typing, then their edit takes over.
  const [edited, setEdited] = useState<string | null>(null);
  const name = edited ?? state.name;

  // The Registrar's copy of the finals record, absent while offline.
  const [verified, setVerified] = useState<Record<string, FinalRecord>>({});
  useEffect(() => {
    if (!token) return;
    let alive = true;
    void apiFinalStatus(token).then((res) => {
      if (alive && res.ok && res.data.finals && typeof res.data.finals === "object") {
        setVerified(res.data.finals as Record<string, FinalRecord>);
      }
    });
    return () => {
      alive = false;
    };
  }, [token]);

  const completed = COURSES.filter((c) => courseProgress(state, c.slug).pct === 100);
  const diplomaReady =
    completed.length === COURSES.length && COURSES.every((c) => state.finals[c.slug]?.passed);
  const diplomaVerified = COURSES.every((c) => verified[c.slug]?.passed);
  const requested = params.get("course");
  const wantDiploma = requested === "diploma" && diplomaReady;
  const course = wantDiploma ? null : (completed.find((c) => c.slug === requested) ?? completed[0]);

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

  if (!course && !wantDiploma) {
    return (
      <div className="learn">
        <div className="learn-wrap">
          <Link href="/learn" className="crumb">
            ← My Learning
          </Link>
          <p className="kicker kicker--acc">Certificate</p>
          <h1 className="learn-h1">Not yet.</h1>
          <p className="learn-sub">
            The certificate unlocks when you finish every unit in a course. No shortcuts. That&apos;s
            what makes it worth printing.
          </p>
          <Link href="/learn" className="btn btn--solid">
            Back to Class →
          </Link>
        </div>
      </div>
    );
  }

  const totalUnits = COURSES.reduce((a, c) => a + c.parts.reduce((x, p) => x + p.units.length, 0), 0);

  return (
    <div className="learn lms-cert-page">
      <div className="learn-wrap">
        <div className="lms-cert-controls">
          <Link href={wantDiploma ? "/learn" : `/learn/${course!.slug}`} className="crumb">
            ← {wantDiploma ? "My Learning" : course!.title}
          </Link>
          <h1 className="lms-section-h">{wantDiploma ? "Your diploma" : "Your certificate"}</h1>
          <p className="lms-section-sub">
            Put your name on it, then print it or save it as a PDF. It&apos;s tied to your account,
            earned the only way possible: by finishing.
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
          {!wantDiploma && diplomaReady && (
            <Link href="/learn/certificate/?course=diploma" className="lms-cert-switch">
              You&apos;ve earned the Diploma →
            </Link>
          )}
        </div>

        {wantDiploma ? (
          <div className="lms-cert lms-cert--diploma" id="certificate">
            <div className="lms-cert-inner">
              <div className="lms-cert-brand">
                <Wordmark gid="cert" />
              </div>
              <p className="lms-cert-label">Diploma</p>
              <p className="lms-cert-name-line">{name.trim() || "Your Name Here"}</p>
              <p className="lms-cert-text">
                completed all {totalUnits} units and passed every Final of
              </p>
              <p className="lms-cert-course">The 13th, 14th &amp; 15th Grades</p>
              <p className="lms-cert-honors">With Honors</p>
              <p className="lms-cert-text lms-cert-sub">High school, finished properly.</p>
              {diplomaVerified && (
                <p className="lms-cert-verified">✓ Verified by the Registrar</p>
              )}
              <div className="lms-cert-foot">
                <span>{today}</span>
                <span className="lms-cert-sweep" aria-hidden="true" />
                <span>selfmadeschool.org</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="lms-cert" id="certificate">
            <div className="lms-cert-inner">
              <div className="lms-cert-brand">
                <Wordmark gid="cert" />
              </div>
              <p className="lms-cert-label">Certificate of Completion</p>
              <p className="lms-cert-name-line">{name.trim() || "Your Name Here"}</p>
              <p className="lms-cert-text">
                completed all {course!.parts.reduce((a, p) => a + p.units.length, 0)} units of
              </p>
              <p className="lms-cert-course">{course!.title}</p>
              {state.finals[course!.slug]?.passed && (
                <p className="lms-cert-honors">With Honors</p>
              )}
              {verified[course!.slug]?.passed && (
                <p className="lms-cert-verified">✓ Verified by the Registrar</p>
              )}
              <p className="lms-cert-text lms-cert-sub">{course!.headline}</p>
              <div className="lms-cert-foot">
                <span>{today}</span>
                <span className="lms-cert-sweep" aria-hidden="true" />
                <span>selfmadeschool.org</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
