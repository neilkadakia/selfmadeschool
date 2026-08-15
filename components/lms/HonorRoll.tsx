"use client";

// Honor Roll: the class leaderboard, names and numbers only. The
// point is friendly rivalry, not surveillance. Hidden until there are
// at least two students to race. Two races: This Week (XP since Monday,
// so newer students get a real shot) and All Time.

import { useEffect, useState } from "react";
import { levelFor } from "@/lib/lms";
import { apiLeaderboard } from "@/lib/api";
import { useLms } from "@/components/useLms";

type Row = {
  rank: number;
  you: boolean;
  name: string;
  xp: number;
  streak: number;
  units: number;
};

const MEDALS = ["🥇", "🥈", "🥉"];

export default function HonorRoll() {
  const lms = useLms();
  const token = lms.auth?.token ?? "";
  const [allRows, setAllRows] = useState<Row[] | null>(null);
  const [weekRows, setWeekRows] = useState<Row[] | null>(null);
  const [classSize, setClassSize] = useState(0);
  const [tab, setTab] = useState<"week" | "all" | null>(null);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    void apiLeaderboard(token).then((r) => {
      if (alive && r.ok && Array.isArray(r.data.board)) {
        const week = Array.isArray(r.data.weekBoard) ? (r.data.weekBoard as Row[]) : [];
        setAllRows(r.data.board as Row[]);
        setWeekRows(week);
        setClassSize((r.data.classSize as number) ?? 0);
        // A dead weekly board on a quiet Monday shouldn't be the opener.
        setTab(week.some((row) => row.xp > 0) ? "week" : "all");
      }
    });
    return () => {
      alive = false;
    };
  }, [token]);

  if (!allRows || allRows.length < 2 || tab === null) return null;

  const week = tab === "week";
  const rows = week ? (weekRows ?? []) : allRows;

  return (
    <section className="lms-section" aria-label="Honor Roll">
      <h2 className="lms-section-h">Honor Roll</h2>
      <p className="lms-section-sub">
        {week
          ? "The class, ranked by XP earned since Monday: a fresh race every week."
          : "The class, ranked by all-time XP. Fastest way up: finish units and keep the streak alive."}
      </p>
      <div className="lms-tabs lms-honor-tabs" role="tablist" aria-label="Honor Roll range">
        <button
          className={`lms-tab${week ? " is-on" : ""}`}
          role="tab"
          aria-selected={week}
          onClick={() => setTab("week")}
        >
          This Week
        </button>
        <button
          className={`lms-tab${week ? "" : " is-on"}`}
          role="tab"
          aria-selected={!week}
          onClick={() => setTab("all")}
        >
          All Time
        </button>
      </div>
      <div className="lms-honor">
        {rows.map((r) => (
          <div key={r.rank} className={`lms-honor-row${r.you ? " is-you" : ""}`}>
            <span className="lms-honor-rank">{MEDALS[r.rank - 1] ?? `#${r.rank}`}</span>
            <span className="lms-honor-name">
              {r.name}
              {r.you && <span className="pill pill--acc">You</span>}
            </span>
            {!week && <span className="lms-honor-level">{levelFor(r.xp).name}</span>}
            <span className="lms-honor-meta">
              {r.units} unit{r.units === 1 ? "" : "s"}
            </span>
            <span className="lms-honor-meta">{r.streak > 0 ? `${r.streak}d 🔥` : "·"}</span>
            <span className="lms-honor-xp">
              {week ? `+${r.xp} XP` : `${r.xp} XP`}
            </span>
          </div>
        ))}
      </div>
      {classSize > rows.length && (
        <p className="lms-hint">Top {rows.length} of {classSize} students.</p>
      )}
    </section>
  );
}
