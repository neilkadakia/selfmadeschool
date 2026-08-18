"use client";

// The pace you set for yourself, and whether you are keeping it.
//
// No lock, no drip, no "this unlocks Tuesday". The student picks a number of
// units a week and the school keeps an honest count against it, including
// saying plainly when its own count is short because the older completions
// were never dated.

import { useLms } from "@/components/useLms";
import { usDate } from "@/lib/format";
import { PACE_CHOICES, readPace } from "@/lib/pace";
import { localDay } from "@/lib/mastery";

export default function PaceCard() {
  const lms = useLms();
  const { state } = lms;
  const read = readPace(state.pace, state.done, state.doneAt, localDay());

  if (!read) {
    return (
      <div className="lms-pace">
        <p className="lms-pace-kicker">Your pace</p>
        <p className="lms-pace-ask">
          How many units a week are you actually going to do? Pick a number you would still hit in
          a bad week. Nothing locks; the school just keeps count.
        </p>
        <div className="lms-pace-choices">
          {PACE_CHOICES.map((n) => (
            <button key={n} className="lms-pace-choice" onClick={() => lms.setPace(n)}>
              {n}/week
            </button>
          ))}
        </div>
      </div>
    );
  }

  const pct = Math.min(100, Math.round((read.thisWeek / read.target) * 100));

  return (
    <div className={`lms-pace${read.onPace ? " is-on" : ""}`}>
      <p className="lms-pace-kicker">Your pace</p>
      <p className="lms-pace-count">
        <strong>{read.thisWeek}</strong> of {read.target} this week
      </p>
      <div className="lms-pace-meter" role="img" aria-label={`${read.thisWeek} of ${read.target} units this week`}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="lms-pace-line">
        {read.onPace
          ? "That is the week done. Anything else is profit."
          : `${read.target - read.thisWeek} to go before Sunday.`}
        {read.finishBy
          ? ` At this rate ${read.course.title} lands ${usDate(read.finishBy)}.`
          : ` ${read.course.title} is finished.`}
      </p>
      {read.partial && (
        <p className="lms-pace-note">
          Units you finished before this counter existed have no date, so they are not in the count.
        </p>
      )}
      <div className="lms-pace-choices">
        {PACE_CHOICES.map((n) => (
          <button
            key={n}
            className={`lms-pace-choice${n === read.target ? " is-on" : ""}`}
            aria-pressed={n === read.target}
            onClick={() => lms.setPace(n)}
          >
            {n}
          </button>
        ))}
        <button className="lms-pace-off" onClick={() => lms.setPace(0)}>
          Stop counting
        </button>
      </div>
    </div>
  );
}
