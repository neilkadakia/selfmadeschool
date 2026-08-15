"use client";

// Field Work: the unit's homework is your actual life. Self-reported,
// one filing per unit (pays XP + credits once), with an optional line
// about what happened. Filed reports stack up as Proof on the Student File.

import { useState } from "react";
import { usDate } from "@/lib/format";
import { useLms } from "@/components/useLms";

type Props = {
  course: string;
  unit: string;
  action: string;
};

export default function FieldWork({ course, unit, action }: Props) {
  const lms = useLms();
  const record = lms.state.fieldwork[`${course}/${unit}`];
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);

  return (
    <section className="panel panel--do lms-do">
      <p className="panel-kicker">Field Work</p>
      <p className="panel-title">Homework: your life</p>
      <p className="panel-body">{action}</p>
      {record && !editing ? (
        <div className="lms-fieldwork-filed">
          <p className="lms-fieldwork-stamp">Filed {usDate(record.date)} ✓</p>
          {record.note && <p className="lms-fieldwork-note">&quot;{record.note}&quot;</p>}
          <button
            className="lms-fieldwork-edit"
            onClick={() => {
              setNote(record.note);
              setEditing(true);
            }}
          >
            {record.note ? "Edit the Note" : "Add a Note"}
          </button>
        </div>
      ) : (
        <div className="lms-fieldwork-form">
          <textarea
            className="lms-notes"
            rows={2}
            maxLength={280}
            placeholder={"What happened out there? One line is plenty. (Optional)"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            className="btn btn--ink lms-fieldwork-btn"
            onClick={() => {
              lms.fieldworkDone(course, unit, note);
              setEditing(false);
            }}
          >
            {record ? "Save the Note" : "I Did It · File the Report"}
          </button>
        </div>
      )}
    </section>
  );
}
