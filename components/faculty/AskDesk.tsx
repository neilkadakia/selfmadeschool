"use client";

// Asking the school something, and reading what came back.
//
// A poll counts; an open question collects sentences with names on them.
// Both can go to the whole school or to one homeroom.

import { useState, type FormEvent } from "react";
import { Room, Panel, Empty, Skeleton, useFacultyData, useFlash } from "@/components/faculty/ui";
import { usDate } from "@/lib/format";
import { formsList, formCreate, formAct, type SchoolForm, type FormKind } from "@/lib/ask";

type Data = { forms: SchoolForm[] };

export default function AskDesk() {
  const { data, error, reload, token } = useFacultyData<Data>(formsList);
  const { flash, node } = useFlash();

  const [title, setTitle] = useState("");
  const [blurb, setBlurb] = useState("");
  const [kind, setKind] = useState<FormKind>("poll");
  const [options, setOptions] = useState(["", ""]);
  const [busy, setBusy] = useState(false);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const r = await formCreate(token, {
      title: title.trim(),
      blurb: blurb.trim(),
      kind,
      options: options.map((o) => o.trim()).filter(Boolean),
      homeroom: "",
    });
    setBusy(false);
    if (r.ok) {
      setTitle("");
      setBlurb("");
      setOptions(["", ""]);
      flash("Asked. Everybody's bell just rang.");
      reload();
    } else {
      flash((r.data.error as string) ?? "Could not ask that.");
    }
  };

  const act = async (a: "close" | "reopen" | "delete", id: string, said: string) => {
    const r = await formAct(token, a, id);
    if (r.ok) {
      flash(said);
      reload();
    }
  };

  const forms = data?.forms ?? [];

  return (
    <Room
      kicker="Faculty Lounge"
      title="Ask the School"
      sub="A poll counts the room; an open question collects sentences. Polls are public once somebody has answered, so nobody is anchored by the majority before they say what they think. Written answers come to faculty with a name on them and go nowhere else."
    >
      {node}
      {error && <Empty title="Could not load that.">{error}</Empty>}
      {!data && !error && <Skeleton rows={3} />}

      {data && (
        <Panel title="Ask something" sub="It lands on every student's bell straight away.">
          <form className="fac-ch-form" onSubmit={create}>
            <label className="fac-field">
              <span>The question</span>
              <input
                className="lms-input"
                maxLength={120}
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What is getting in the way of finishing a unit?"
              />
            </label>
            <label className="fac-field">
              <span>A note, if it needs one</span>
              <input
                className="lms-input"
                maxLength={300}
                value={blurb}
                onChange={(e) => setBlurb(e.target.value)}
                placeholder="Honest answers only. Nothing here affects anything."
              />
            </label>
            <div className="fac-ch-row">
              <label className="fac-field">
                <span>Shape</span>
                <select
                  className="lms-input"
                  value={kind}
                  onChange={(e) => setKind(e.target.value as FormKind)}
                >
                  <option value="poll">Poll, with options</option>
                  <option value="open">Open question</option>
                </select>
              </label>
            </div>

            {kind === "poll" && (
              <div className="fac-ask-options">
                {options.map((o, i) => (
                  <input
                    key={i}
                    className="lms-input"
                    maxLength={90}
                    value={o}
                    placeholder={`Option ${i + 1}`}
                    onChange={(e) =>
                      setOptions((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))
                    }
                  />
                ))}
                {options.length < 6 && (
                  <button
                    type="button"
                    className="fac-btn fac-btn--sm"
                    onClick={() => setOptions((p) => [...p, ""])}
                  >
                    Add an option
                  </button>
                )}
              </div>
            )}

            <button className="btn btn--outline" type="submit" disabled={busy}>
              {busy ? "Asking…" : "Ask the School"}
            </button>
          </form>
        </Panel>
      )}

      {data && forms.length === 0 && (
        <Empty title="Nothing asked yet.">
          {" "}
          The best questions here are the ones you actually do not know the answer to.
        </Empty>
      )}

      {forms.map((f) => {
        const total = (f.counts ?? []).reduce((a, b) => a + b, 0);
        return (
          <Panel
            key={f.id}
            title={f.title}
            sub={`${f.kind === "poll" ? "Poll" : "Open question"} · ${f.answered} ${
              f.answered === 1 ? "answer" : "answers"
            } · asked ${usDate(f.created)}${f.closed ? " · closed" : ""}`}
            actions={
              <>
                <button
                  className="fac-btn fac-btn--sm"
                  onClick={() =>
                    void act(
                      f.closed ? "reopen" : "close",
                      f.id,
                      f.closed ? "Open again." : "Closed."
                    )
                  }
                >
                  {f.closed ? "Reopen" : "Close"}
                </button>
                <button
                  className="fac-btn fac-btn--sm"
                  onClick={() => void act("delete", f.id, "Taken down.")}
                >
                  Take It Down
                </button>
              </>
            }
          >
            {f.kind === "poll" ? (
              <div className="fac-ask-results">
                {f.options.map((o, i) => {
                  const n = f.counts?.[i] ?? 0;
                  const pct = total ? Math.round((n / total) * 100) : 0;
                  return (
                    <div key={i} className="fac-ask-row">
                      <span className="fac-ask-label">{o}</span>
                      <span className="fac-ask-bar">
                        <span style={{ width: `${pct}%` }} />
                      </span>
                      <span className="fac-ask-n">
                        {n} · {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="fac-ask-written">
                {(f.written ?? []).length === 0 ? (
                  <p className="fac-panel-sub">Nobody has written back yet.</p>
                ) : (
                  (f.written ?? []).map((w, i) => (
                    <div key={i} className="fac-ask-answer">
                      <p className="fac-quad-who">
                        {w.name} · {usDate(w.at)}
                      </p>
                      <p className="fac-quad-text">{w.text}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </Panel>
        );
      })}
    </Room>
  );
}
