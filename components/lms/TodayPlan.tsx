"use client";

// Today's Plan: a tiny daily attendance sheet. Show up, learn one new
// thing, hit Study Hall. Tick all three and class is dismissed for the
// day. Purely derived from state; nothing to configure.

import Link from "next/link";
import type { LmsState } from "@/components/useLms";

type Props = {
  state: LmsState;
  todayKey: string; // local yyyy-mm-dd
  nextHref: string;
  totalDone: number;
};

export default function TodayPlan({ state, todayKey, nextHref, totalDone }: Props) {
  const items = [
    {
      label: "Show Up",
      done: state.streak.last === todayKey,
      href: nextHref,
    },
    {
      label: "Learn One New Thing",
      done: state.lastUnitDay === todayKey,
      href: nextHref,
    },
    ...(totalDone > 0
      ? [
          {
            label: "Study Hall Review",
            done: state.reviewLast === todayKey,
            href: "/learn/review",
          },
        ]
      : []),
  ];
  const allDone = items.every((i) => i.done);

  return (
    <div className="lms-plan" aria-label="Today's plan">
      <span className="lms-plan-h">Today&apos;s Plan</span>
      {items.map((it) =>
        it.done ? (
          <span key={it.label} className="lms-plan-item is-done">
            <span className="lms-plan-box" aria-hidden="true">
              ✓
            </span>
            {it.label}
          </span>
        ) : (
          <Link key={it.label} href={it.href} className="lms-plan-item">
            <span className="lms-plan-box" aria-hidden="true" />
            {it.label}
          </Link>
        )
      )}
      {allDone && <span className="lms-plan-dismissed">Class dismissed 🎓</span>}
    </div>
  );
}
