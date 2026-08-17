"use client";

// The Front Desk: what needs a teacher today.
//
// Not a dashboard. A dashboard tells you how things are going; this tells
// you what to do next, in the order a person would actually do it. Work
// students are waiting on comes first, because somebody wrote something
// and nobody has answered. Then people who have gone quiet. Then the
// numbers, at the bottom, where they belong.
//
// When there is nothing to do it says so plainly. An empty queue is a good
// day, not a broken screen.

import Link from "next/link";
import { useState } from "react";
import { usDate } from "@/lib/format";
import { ago, facDesk, type Desk } from "@/lib/faculty";
import { Empty, Panel, Pulse, Room, Skeleton, Stat, useFacultyData, useFlash } from "./ui";
import StudentFile from "./StudentFile";
import ReplyBox from "./ReplyBox";

export default function FrontDesk() {
  const { data, error, reload, token, lms } = useFacultyData<Desk>(facDesk);
  const { flash, node: flashNode } = useFlash();
  const [open, setOpen] = useState<string | null>(null);
  const [replying, setReplying] = useState<string | null>(null);

  const first = (lms.auth?.first || lms.auth?.name || "").split(" ")[0];

  if (error) {
    return (
      <Room kicker="Faculty Lounge" title="Front Desk">
        <Empty title="The desk is unreachable.">{error}</Empty>
      </Room>
    );
  }

  if (!data) {
    return (
      <Room kicker="Faculty Lounge" title="Front Desk">
        <Skeleton rows={6} />
      </Room>
    );
  }

  const waiting = data.fieldworkTotal + data.questionsTotal;
  const line =
    waiting === 0
      ? "Nothing is waiting on you. The class is running itself today."
      : waiting === 1
        ? "One thing is waiting on you."
        : `${waiting} things are waiting on you.`;

  return (
    <Room
      kicker="Faculty Lounge"
      title={first ? `Morning, ${first}.` : "Front Desk"}
      sub={line}
      actions={
        <>
          <Link href="/learn/faculty/gradebook" className="fac-btn">
            Open the Gradebook
          </Link>
          <Link href="/learn/faculty/bulletin" className="fac-btn">
            Pin a Note
          </Link>
        </>
      }
    >
      {/* ---- Field Work waiting on a reply ---- */}
      <Panel
        title="Field Work, unanswered"
        count={data.fieldworkTotal}
        sub="They did the thing in the real world and wrote about it. Nobody has written back yet."
        flush
        actions={
          data.fieldworkTotal > data.fieldwork.length ? (
            <Link href="/learn/faculty/fieldwork" className="fac-btn fac-btn--sm">
              See All {data.fieldworkTotal}
            </Link>
          ) : null
        }
      >
        {data.fieldwork.length === 0 ? (
          <Empty title="Every filing has an answer.">
            When somebody files a report, it lands here until a teacher reads it.
          </Empty>
        ) : (
          data.fieldwork.map((f) => {
            const key = `${f.email}|${f.course}/${f.unit}`;
            return (
              <article key={key} className="fac-item">
                <div className="fac-item-top">
                  <button className="fac-who" onClick={() => setOpen(f.email)}>
                    {f.name}
                  </button>
                  <span className="fac-where">
                    {f.unitTitle} · {f.courseTitle}
                  </span>
                  <span className="fac-when">{f.date ? usDate(f.date) : ""}</span>
                </div>
                <p className="fac-said">{f.note}</p>
                {replying === key ? (
                  <ReplyBox
                    token={token}
                    email={f.email}
                    unitKey={`${f.course}/${f.unit}`}
                    name={f.name}
                    onDone={() => {
                      setReplying(null);
                      reload();
                      flash(`Answered ${f.name.split(" ")[0]}. They get an email and see it on the unit.`);
                    }}
                    onCancel={() => setReplying(null)}
                  />
                ) : (
                  <div className="fac-item-actions">
                    <button className="fac-btn fac-btn--sm fac-btn--go" onClick={() => setReplying(key)}>
                      Write Back
                    </button>
                    <button className="fac-btn fac-btn--sm fac-btn--quiet" onClick={() => setOpen(f.email)}>
                      Open Their File
                    </button>
                  </div>
                )}
              </article>
            );
          })
        )}
      </Panel>

      {/* ---- questions nobody has answered ---- */}
      <Panel
        title="Questions in the Study Group"
        count={data.questionsTotal}
        sub="Posts in threads no member of staff has spoken in yet."
        flush
        actions={
          data.questionsTotal > data.questions.length ? (
            <Link href="/learn/faculty/discussion" className="fac-btn fac-btn--sm">
              See All {data.questionsTotal}
            </Link>
          ) : null
        }
      >
        {data.questions.length === 0 ? (
          <Empty title="Nobody is waiting on an answer.">
            Threads where a teacher has already posted drop off this list.
          </Empty>
        ) : (
          data.questions.map((q) => (
            <article key={q.id} className="fac-item">
              <div className="fac-item-top">
                <button className="fac-who" onClick={() => setOpen(q.email)}>
                  {q.name}
                </button>
                <span className="fac-where">
                  {q.unitTitle} · {q.courseTitle}
                </span>
                <span className="fac-when">{ago(q.created)}</span>
              </div>
              <p className="fac-said">{q.text}</p>
              <div className="fac-item-actions">
                <Link
                  href={`/learn/${q.course}/${q.unit}/`}
                  className="fac-btn fac-btn--sm fac-btn--go"
                >
                  Answer in the Thread
                </Link>
                {q.ups > 0 && (
                  <span className="fac-btn fac-btn--sm fac-btn--quiet" style={{ cursor: "default" }}>
                    {q.ups} upvote{q.ups === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            </article>
          ))
        )}
      </Panel>

      {/* ---- gone quiet ---- */}
      <Panel
        title="Gone quiet"
        count={data.quiet.length}
        countTone="quiet"
        sub="Started the work, then stopped. A week or more since they showed up."
        flush
      >
        {data.quiet.length === 0 ? (
          <Empty title="Everybody who started is still going.">
            Nobody who has finished a unit has been away a week.
          </Empty>
        ) : (
          <div className="fac-table">
            <div className="fac-tr fac-tr--head" style={{ gridTemplateColumns: "minmax(0,1.4fr) 90px 90px 1fr" }}>
              <span>Student</span>
              <span>Away</span>
              <span>Units</span>
              <span />
            </div>
            {data.quiet.map((q) => (
              <div
                key={q.email}
                className="fac-tr"
                style={{ gridTemplateColumns: "minmax(0,1.4fr) 90px 90px 1fr" }}
              >
                <button className="fac-who" onClick={() => setOpen(q.email)}>
                  {q.name}
                </button>
                <span className="fac-num fac-warn" data-k="Away">
                  {q.days} days
                </span>
                <span className="fac-num fac-muted" data-k="Units">
                  {q.units}
                </span>
                <span style={{ textAlign: "right" }}>
                  <button className="fac-btn fac-btn--sm" onClick={() => setOpen(q.email)}>
                    Open Their File
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* ---- new faces, and what's on the calendar ---- */}
      {(data.newest.length > 0 || data.sessions.length > 0) && (
        <div style={{ display: "grid", gap: 22, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
          {data.newest.length > 0 && (
            <Panel title="New this week" count={data.newest.length} countTone="quiet" flush>
              {data.newest.map((n) => (
                <div key={n.email} className="fac-item">
                  <div className="fac-item-top">
                    <button className="fac-who" onClick={() => setOpen(n.email)}>
                      {n.name}
                    </button>
                    <span className="fac-when">{ago(n.joined)}</span>
                  </div>
                  <p className="fac-panel-sub" style={{ margin: 0 }}>
                    {n.units === 0
                      ? "Has not opened a unit yet."
                      : `${n.units} unit${n.units === 1 ? "" : "s"} done already.`}
                  </p>
                </div>
              ))}
            </Panel>
          )}

          {data.sessions.length > 0 && (
            <Panel title="Office Hours ahead" flush>
              {data.sessions.map((s) => (
                <div key={s.id} className="fac-item">
                  <div className="fac-item-top">
                    <span style={{ fontWeight: 700, fontSize: "14.5px" }}>{s.title}</span>
                    <span className="fac-when">{usDate(s.startsAt)}</span>
                  </div>
                  <p className="fac-panel-sub" style={{ margin: 0 }}>
                    {s.seats} of {s.capacity} seats taken
                    {s.waiting > 0 && ` · ${s.waiting} waiting`}
                  </p>
                </div>
              ))}
            </Panel>
          )}
        </div>
      )}

      {/* ---- the numbers, last ---- */}
      <h2 className="fac-panel-h" style={{ margin: "34px 0 14px" }}>
        The school today
      </h2>
      <Pulse>
        <Stat n={data.pulse.students} label="Students" />
        <Stat n={data.pulse.activeWeek} label="Active this week" tone="acc" />
        <Stat n={data.pulse.unitsDone} label="Units completed" />
        <Stat n={data.pulse.finalsPassed} label="Finals passed" />
        <Stat n={data.pulse.quiet} label="Gone quiet" tone={data.pulse.quiet > 0 ? "warn" : undefined} />
        <Stat n={data.pulse.faculty} label="On staff" />
      </Pulse>

      {open && <StudentFile email={open} onClose={() => setOpen(null)} onChange={reload} flash={flash} />}
      {flashNode}
    </Room>
  );
}
