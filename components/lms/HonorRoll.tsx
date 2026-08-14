"use client";

// Honor Roll: the class leaderboard, names and numbers only — the
// point is friendly rivalry, not surveillance. Hidden until there are
// at least two students to race.

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
  const [rows, setRows] = useState<Row[] | null>(null);
  const [classSize, setClassSize] = useState(0);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    void apiLeaderboard(token).then((r) => {
      if (alive && r.ok && Array.isArray(r.data.board)) {
        setRows(r.data.board as Row[]);
        setClassSize((r.data.classSize as number) ?? 0);
      }
    });
    return () => {
      alive = false;
    };
  }, [token]);

  if (!rows || rows.length < 2) return null;

  return (
    <section className="lms-section" aria-label="Honor Roll">
      <h2 className="lms-section-h">Honor Roll</h2>
      <p className="lms-section-sub">
        The class, ranked by XP. Fastest way up: finish units and keep the streak alive.
      </p>
      <div className="lms-honor">
        {rows.map((r) => (
          <div key={r.rank} className={`lms-honor-row${r.you ? " is-you" : ""}`}>
            <span className="lms-honor-rank">{MEDALS[r.rank - 1] ?? `#${r.rank}`}</span>
            <span className="lms-honor-name">
              {r.name}
              {r.you && <span className="pill pill--acc">You</span>}
            </span>
            <span className="lms-honor-level">{levelFor(r.xp).name}</span>
            <span className="lms-honor-meta">
              {r.units} unit{r.units === 1 ? "" : "s"}
            </span>
            <span className="lms-honor-meta">{r.streak > 0 ? `${r.streak}d 🔥` : "—"}</span>
            <span className="lms-honor-xp">{r.xp} XP</span>
          </div>
        ))}
      </div>
      {classSize > rows.length && (
        <p className="lms-hint">Top {rows.length} of {classSize} students.</p>
      )}
    </section>
  );
}
