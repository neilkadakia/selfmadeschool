"use client";

// The school asked you something.
//
// Sits on the desk and shows nothing at all when there is nothing to answer,
// which is most days. A poll shows the room once you have voted, because
// seeing where everyone else landed is half the reason to ask.

import { useCallback, useEffect, useState } from "react";
import { useLms } from "@/components/useLms";
import { useSchool } from "./useSchool";
import { formsList, formAnswer, type SchoolForm } from "@/lib/ask";

export default function AskCard() {
  const lms = useLms();
  const school = useSchool();
  const token = lms.auth?.token ?? "";
  const on = Boolean(school.features?.forms);
  const [forms, setForms] = useState<SchoolForm[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    if (!token || !on) return;
    void formsList(token).then((r) => {
      if (r.ok) setForms((r.data.forms as SchoolForm[]) ?? []);
    });
  }, [token, on]);

  useEffect(() => {
    load();
  }, [load]);

  if (!on || forms.length === 0) return null;

  const answer = async (id: string, value: number | string) => {
    await formAnswer(token, id, value);
    load();
  };

  return (
    <>
      {forms.map((f) => (
        <div key={f.id} className="lms-ask">
          <p className="lms-ask-kicker">
            The school is asking{f.closed ? " · closed" : ""}
          </p>
          <p className="lms-ask-title">{f.title}</p>
          {f.blurb && <p className="lms-ask-blurb">{f.blurb}</p>}

          {f.kind === "poll" ? (
            <div className="lms-ask-options">
              {f.options.map((o, i) => {
                const votes = f.counts?.[i] ?? 0;
                const total = (f.counts ?? []).reduce((a, b) => a + b, 0);
                const pct = total ? Math.round((votes / total) * 100) : 0;
                const mine = f.you === i;
                // The room only appears once you have said your piece, so
                // nobody is anchored by the majority before they answer.
                const show = f.you !== null;
                return (
                  <button
                    key={i}
                    className={`lms-ask-opt${mine ? " is-mine" : ""}`}
                    disabled={f.closed}
                    onClick={() => void answer(f.id, i)}
                  >
                    {show && <span className="lms-ask-fill" style={{ width: `${pct}%` }} aria-hidden="true" />}
                    <span className="lms-ask-opt-text">{o}</span>
                    {show && <span className="lms-ask-pct">{pct}%</span>}
                  </button>
                );
              })}
              {f.you !== null && (
                <p className="lms-ask-note">
                  {f.answered} {f.answered === 1 ? "answer" : "answers"} so far. Click another to
                  change yours.
                </p>
              )}
            </div>
          ) : (
            <div className="lms-ask-open">
              <textarea
                className="lms-notes"
                rows={3}
                maxLength={600}
                placeholder="Say it in your own words."
                value={draft[f.id] ?? (typeof f.you === "string" ? f.you : "")}
                disabled={f.closed}
                onChange={(e) => setDraft((d) => ({ ...d, [f.id]: e.target.value }))}
              />
              <div className="lms-ask-open-foot">
                <span className="lms-ask-note">
                  {typeof f.you === "string" && f.you
                    ? "Answered. Faculty can see this with your name on it."
                    : "Faculty see this with your name on it. Nobody else does."}
                </span>
                <button
                  className="quad-send"
                  disabled={f.closed || !(draft[f.id] ?? "").trim()}
                  onClick={() => void answer(f.id, (draft[f.id] ?? "").trim())}
                >
                  {typeof f.you === "string" && f.you ? "Change It" : "Send It"}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
