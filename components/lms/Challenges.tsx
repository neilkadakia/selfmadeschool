"use client";

// Challenges: a push with a deadline, measured from what you already do.
//
// Nothing here asks you to log anything. You join, the school writes down
// where you stood, and the bar fills as you get on with the work. Joining
// late never hands you credit for last month.

import { useCallback, useEffect, useState } from "react";
import { usDate } from "@/lib/format";
import { useLms } from "@/components/useLms";
import { challengeList, challengeJoin, type Challenge } from "@/lib/challenges";

export default function Challenges() {
  const lms = useLms();
  const token = lms.auth?.token ?? "";
  const [rows, setRows] = useState<Challenge[] | null>(null);
  const [offline, setOffline] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    void challengeList(token).then((r) => {
      if (r.status === 0) {
        setOffline(true);
        return;
      }
      setOffline(false);
      if (r.ok) setRows((r.data.challenges as Challenge[]) ?? []);
    });
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (!token) return null;

  const join = async (id: string, next: boolean) => {
    await challengeJoin(token, id, next);
    load();
  };

  const open = rows?.filter((c) => c.open) ?? [];
  const closed = rows?.filter((c) => !c.open) ?? [];

  return (
    <div className="learn challenges">
      <div className="learn-wrap">
      <header className="learn-head">
        <p className="kicker kicker--acc">Challenges</p>
        <h1 className="learn-h1">Something to aim at.</h1>
        <p className="learn-sub">
          A challenge is a deadline with a number on it. Join one and the school notes where you
          are standing right now, so the bar only moves for work you do from here. There is nothing
          to log and nothing to check in on.
        </p>
      </header>

      {offline && <p className="lms-muted">Challenges need a connection. They&apos;ll be here when you&apos;re back.</p>}

      {rows && rows.length === 0 && (
        <p className="lms-muted">
          Nothing running right now. Faculty set these, and the next one will show up here.
        </p>
      )}

      {open.length > 0 && (
        <section className="reg-section" aria-label="Running now">
          <h2 className="quad-h2">
            Running now <span className="quad-h2-count">{open.length}</span>
          </h2>
          <div className="ch-grid">
            {open.map((c) => (
              <Card key={c.id} c={c} onJoin={join} />
            ))}
          </div>
        </section>
      )}

      {closed.length > 0 && (
        <section className="reg-section" aria-label="Closed">
          <h2 className="quad-h2">Closed</h2>
          <div className="ch-grid">
            {closed.map((c) => (
              <Card key={c.id} c={c} onJoin={join} />
            ))}
          </div>
        </section>
      )}
      </div>
    </div>
  );
}

function Card({ c, onJoin }: { c: Challenge; onJoin: (id: string, next: boolean) => Promise<void> }) {
  const progress = c.you?.progress ?? 0;
  const pct = Math.min(100, Math.round((progress / c.target) * 100));
  const done = Boolean(c.you?.done);
  const left = Math.max(0, c.target - progress);

  return (
    <article className={`ch-card${done ? " is-done" : ""}${c.open ? "" : " is-closed"}`}>
      <div className="ch-card-top">
        <h3 className="ch-name">{c.name}</h3>
        {done ? (
          <span className="ch-badge">Finished</span>
        ) : (
          !c.open && <span className="ch-badge is-quiet">Closed</span>
        )}
      </div>

      {/* The number is the point of a challenge, so it is the biggest thing
          on the card rather than a line of small print. */}
      <p className="ch-target">
        <span className="ch-target-num">{c.target}</span>
        <span className="ch-target-unit">{c.unit}</span>
      </p>
      <p className="ch-goal">
        {c.absolute ? "Reach it" : "Counted from the day you join"}
        {c.endsAt ? ` · closes ${usDate(c.endsAt)}` : ""}
      </p>

      {c.blurb && <p className="ch-blurb">{c.blurb}</p>}

      {c.you ? (
        <div className="ch-progress">
          <div className="ch-meter" role="img" aria-label={`${progress} of ${c.target} ${c.unit}`}>
            <span className="ch-meter-fill" style={{ width: `${pct}%` }} />
          </div>
          <p className="ch-count">
            {done ? (
              <>Done{c.you.doneAt ? ` · ${usDate(c.you.doneAt)}` : ""}</>
            ) : (
              <>
                <strong>{progress}</strong> of {c.target} · {left} to go
              </>
            )}
          </p>
        </div>
      ) : (
        <p className="ch-notyet">Join and the bar starts from where you stand today.</p>
      )}

      <div className="ch-foot">
        <span className="ch-people">
          {c.members} {c.members === 1 ? "person in" : "people in"}
          {c.finished > 0 ? ` · ${c.finished} finished` : ""}
        </span>
        {c.open && !done && (
          <button
            className={`quad-join${c.you?.joined ? " is-in" : ""}`}
            aria-pressed={Boolean(c.you?.joined)}
            onClick={() => void onJoin(c.id, !c.you?.joined)}
          >
            {c.you?.joined ? "Leave" : "Join"}
          </button>
        )}
      </div>

      {c.finishers.length > 0 && (
        <p className="ch-finishers">
          <span className="ch-finishers-label">Finished</span>
          {c.finishers.join(" · ")}
        </p>
      )}
    </article>
  );
}
