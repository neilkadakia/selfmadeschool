"use client";

// Office Hours: upcoming live sessions on the desk. Save a seat while
// there are seats; after that the waitlist keeps your place and the
// server emails you the moment one opens. Renders nothing when the
// calendar is empty, exactly like the Honor Roll.

import { useEffect, useState } from "react";
import { apiSessions, apiSessionAct, type Session } from "@/lib/api";
import { usDate } from "@/lib/format";
import { downloadIcs } from "@/lib/ics";
import { useLms } from "@/components/useLms";

function when(s: Session): string {
  const d = new Date(s.startsAt);
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${usDate(d.toISOString().slice(0, 10))} · ${time} · ${s.durationMin} min`;
}

export default function OfficeHours() {
  const lms = useLms();
  const token = lms.auth?.token ?? "";
  const [sessions, setSessions] = useState<Session[] | null>(null);

  const load = () => {
    void apiSessions(token).then((r) => {
      if (r.ok && Array.isArray(r.data.sessions)) setSessions(r.data.sessions as Session[]);
    });
  };

  useEffect(() => {
    if (!token) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!sessions || sessions.length === 0) return null;

  return (
    <section className="lms-oh" aria-label="Office Hours">
      <h2 className="lms-section-h">Office Hours</h2>
      <p className="lms-section-sub">
        Live, small, and honest. Bring the question you&apos;d never post publicly.
      </p>
      {sessions.map((s) => {
        const full = s.seats >= s.capacity;
        return (
          <div key={s.id} className="lms-oh-row">
            <div className="lms-oh-main">
              <p className="lms-oh-when">{when(s)}</p>
              <p className="lms-oh-title">{s.title}</p>
              {s.blurb && <p className="lms-oh-blurb">{s.blurb}</p>}
              <p className="lms-oh-seats">
                {s.seats} of {s.capacity} seats taken
                {s.waiting > 0 && ` · ${s.waiting} waiting`}
                {s.host && ` · hosted by ${s.host}`}
              </p>
            </div>
            <div className="lms-oh-side">
              {s.you === "in" ? (
                <>
                  <span className="lms-oh-state">Seat saved ✓</span>
                  {s.link && (
                    <a className="btn btn--solid lms-oh-btn" href={s.link} target="_blank" rel="noreferrer">
                      Join Link →
                    </a>
                  )}
                  <button className="lms-oh-cancel" onClick={() => downloadIcs(s)}>
                    Add to Calendar
                  </button>
                  <button
                    className="lms-oh-cancel"
                    onClick={() => void apiSessionAct(token, "cancel", s.id).then(load)}
                  >
                    Give Up the Seat
                  </button>
                </>
              ) : s.you === "waitlist" ? (
                <>
                  <span className="lms-oh-state">Waitlisted #{s.waitSpot}</span>
                  <button
                    className="lms-oh-cancel"
                    onClick={() => void apiSessionAct(token, "cancel", s.id).then(load)}
                  >
                    Leave the Waitlist
                  </button>
                </>
              ) : (
                <button
                  className="btn btn--outline lms-oh-btn"
                  onClick={() => void apiSessionAct(token, "rsvp", s.id).then(load)}
                >
                  {full ? "Join the Waitlist" : "Save My Seat"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
