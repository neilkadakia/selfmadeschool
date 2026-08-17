"use client";

// Pointing somebody at a unit.
//
// What this is depends on one school setting. With deadlines off it is an
// invitation: a unit, a note in the teacher's own words, and that is all.
// With deadlines on the same form grows a date. The copy changes with it,
// because "due by" and "start here" are not the same thing to read.

import { useState } from "react";
import { COURSES, courseUnits } from "@/lib/lms";
import { assignGive } from "@/lib/faculty";

export default function AssignBox({
  token,
  email,
  homeroom,
  name,
  deadlines = false,
  onDone,
  onCancel,
}: {
  token: string;
  email?: string;
  homeroom?: string;
  name: string;
  deadlines?: boolean;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [course, setCourse] = useState(COURSES[0].slug);
  const [unit, setUnit] = useState("");
  const [note, setNote] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const picked = COURSES.find((c) => c.slug === course) ?? COURSES[0];
  // Only units with a written lesson: pointing at an empty unit would be
  // sending somebody to a locked room.
  const units = courseUnits(picked).filter((u) => Boolean(picked.lessons[u.slug]));

  const send = async () => {
    if (busy) return;
    setBusy(true);
    const r = await assignGive(token, {
      ...(homeroom ? { homeroom } : { email }),
      course,
      unit,
      note: note.trim(),
      ...(deadlines && due ? { due } : {}),
    });
    setBusy(false);
    if (r.ok) onDone();
    else setError((r.data.error as string) ?? "Could not send that.");
  };

  return (
    <div className="fac-compose">
      <label className="fac-field">
        <span className="fac-label">Course</span>
        <select
          className="fac-select"
          value={course}
          onChange={(e) => {
            setCourse(e.target.value);
            setUnit("");
          }}
        >
          {COURSES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.title}
            </option>
          ))}
        </select>
      </label>

      <label className="fac-field">
        <span className="fac-label">Unit</span>
        <select className="fac-select" value={unit} onChange={(e) => setUnit(e.target.value)}>
          <option value="">The whole course</option>
          {units.map((u) => (
            <option key={u.slug} value={u.slug}>
              {u.number}. {u.title}
            </option>
          ))}
        </select>
      </label>

      <label className="fac-field">
        <span className="fac-label">Your note</span>
        <textarea
          className="fac-textarea"
          rows={2}
          maxLength={400}
          placeholder={`Why this one, for ${name.split(" ")[0]}. It shows up on their desk in your words.`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      {deadlines && (
        <label className="fac-field">
          <span className="fac-label">Due by (optional)</span>
          <input
            className="fac-input"
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
          <span className="fac-hint">Leave it empty and this is an invitation, not homework.</span>
        </label>
      )}

      {error && (
        <p className="fac-hint fac-warn" role="alert">
          {error}
        </p>
      )}

      <div className="fac-item-actions">
        <button className="fac-btn fac-btn--sm fac-btn--go" disabled={busy} onClick={() => void send()}>
          {busy ? "Sending…" : homeroom ? "Send to the Homeroom" : "Put It on Their Desk"}
        </button>
        <button className="fac-btn fac-btn--sm fac-btn--quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
