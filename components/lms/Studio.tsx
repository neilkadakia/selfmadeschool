"use client";

// The Studio: the faculty writing room. Draft a complete unit from a topic
// with the Copilot (Claude server-side when the school has an API key, a
// labeled template skeleton otherwise), preview it exactly as students would
// see it, edit the JSON, and export it as TypeScript for the course files.
// Content still ships through the build. The Studio is where it gets written.

import { useEffect, useState, type FormEvent } from "react";
import { COURSES, type LessonBlock } from "@/lib/lms";
import {
  apiDraftList,
  apiDraftCreate,
  apiDraftSave,
  apiDraftDelete,
  type Draft,
  type DraftLesson,
} from "@/lib/api";
import { usDate } from "@/lib/format";
import { useLms } from "@/components/useLms";
import { Block } from "./Player";

function slugFor(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "new-unit"
  );
}

// A draft as a TypeScript lessons-record entry: JSON is valid TS.
function asTypeScript(d: Draft): string {
  const l = d.lesson;
  const field = (v: unknown) => JSON.stringify(v, null, 2).replace(/\n/g, "\n  ");
  return [
    `// ${l.title}, drafted in the Studio (${d.engine}), ${usDate(d.updated)}`,
    `// Paste into the course's lessons record (lib/lessons13.ts etc.),`,
    `// add the unit to lib/curriculum.ts if it's new, then npm run build`,
    `// (the build regenerates the Registrar's answer key).`,
    `"${slugFor(l.title)}": {`,
    `  hook: ${field(l.hook)},`,
    `  blocks: ${field(l.blocks)},`,
    `  quiz: ${field(l.quiz)},`,
    `  cards: ${field(l.cards)},`,
    `  action: ${field(l.action)},`,
    `},`,
  ].join("\n");
}

type Props = { flash: (t: string) => void };

export default function Studio({ flash }: Props) {
  const lms = useLms();
  const token = lms.auth?.token ?? "";
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [copilotOn, setCopilotOn] = useState(false);
  const [course, setCourse] = useState(COURSES[0].slug);
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [editText, setEditText] = useState("");
  const [editError, setEditError] = useState("");

  useEffect(() => {
    if (!token) return;
    void apiDraftList(token).then((r) => {
      if (r.ok) {
        setDrafts(r.data.drafts as Draft[]);
        setCopilotOn(Boolean(r.data.copilot));
      }
    });
  }, [token]);

  const draft = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const res = await apiDraftCreate(token, course, topic.trim(), notes.trim());
    setBusy(false);
    if (res.ok) {
      setTopic("");
      setNotes("");
      const r = await apiDraftList(token);
      if (r.ok) setDrafts(r.data.drafts as Draft[]);
      flash(
        res.data.engine === "claude"
          ? "Drafted. Read it like an editor. The Copilot writes fast, you decide what ships."
          : "Template draft ready. The TODOs are your outline. (Set ANTHROPIC_API_KEY server-side for Claude drafts.)"
      );
    } else {
      flash((res.data.error as string) ?? "The Copilot could not draft that.");
    }
  };

  const saveEdit = async (id: string) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(editText);
    } catch {
      setEditError("That's not valid JSON yet. Check for a missing comma or quote.");
      return;
    }
    const res = await apiDraftSave(token, id, parsed);
    if (res.ok) {
      setEditError("");
      setMode("preview");
      const r = await apiDraftList(token);
      if (r.ok) setDrafts(r.data.drafts as Draft[]);
      flash("Draft saved.");
    } else {
      setEditError((res.data.error as string) ?? "Could not save that.");
    }
  };

  const remove = async (id: string) => {
    const res = await apiDraftDelete(token, id);
    if (res.ok) {
      setDrafts((prev) => prev?.filter((d) => d.id !== id) ?? null);
      if (open === id) setOpen(null);
      flash("Draft torn up.");
    }
  };

  const copyTs = (d: Draft) => {
    void navigator.clipboard.writeText(asTypeScript(d)).then(() => {
      flash("TypeScript copied. Paste it into the course's lessons record.");
    });
  };

  return (
    <>
      <section className="lms-section">
        <h2 className="lms-section-h">The Studio</h2>
        <p className="lms-section-sub">
          Give the Copilot a topic and it drafts the whole unit in the house voice: lesson,
          knowledge check, flashcards, Field Work.{" "}
          {copilotOn
            ? "Drafts are starting points: read like an editor, cut what doesn't sound like us."
            : "The Copilot is offline (no API key on the server), so drafts come out as labeled skeletons, still the fastest way to outline a unit."}
        </p>
        <form className="lms-admin-form" onSubmit={draft}>
          <select
            className="lms-cert-name lms-role-select--form"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            aria-label="Course"
          >
            {COURSES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title}
              </option>
            ))}
          </select>
          <input
            className="lms-cert-name"
            placeholder="Unit topic (e.g. Renters insurance, actually explained)"
            required
            minLength={3}
            maxLength={120}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <textarea
            className="lms-cert-name lms-bulletin-input"
            placeholder="Notes for the Copilot (optional): angles to hit, numbers to use, what to avoid"
            rows={2}
            maxLength={2000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button className="btn btn--solid lms-login-btn" type="submit" disabled={busy}>
            {busy ? "The Copilot is writing. Give it a minute…" : "Draft With the Copilot"}
          </button>
        </form>
      </section>

      {drafts && drafts.length > 0 && (
        <section className="lms-section">
          <h2 className="lms-section-h">Draft shelf</h2>
          <p className="lms-section-sub">
            {drafts.length} draft{drafts.length === 1 ? "" : "s"}. Export copies the unit as
            TypeScript for the course files. Nothing reaches students until it ships in a build.
          </p>
          {drafts.map((d) => (
            <div key={d.id} className="lms-draft">
              <div className="lms-draft-head">
                <div className="lms-draft-id">
                  <span className="lms-draft-title">{d.lesson.title}</span>
                  <span className="lms-draft-meta">
                    {d.topic} · {d.course} · {d.engine === "claude" ? "Copilot" : "template"} ·{" "}
                    {usDate(d.updated)}
                  </span>
                </div>
                <div className="lms-draft-actions">
                  <button
                    className="lms-signout"
                    onClick={() => {
                      if (open === d.id) {
                        setOpen(null);
                      } else {
                        setOpen(d.id);
                        setMode("preview");
                        setEditError("");
                      }
                    }}
                  >
                    {open === d.id ? "Close" : "Open"}
                  </button>
                  <button className="lms-signout" onClick={() => copyTs(d)}>
                    Copy as TypeScript
                  </button>
                  <button className="lms-signout" onClick={() => void remove(d.id)}>
                    Tear Up
                  </button>
                </div>
              </div>

              {open === d.id && (
                <div className="lms-draft-body">
                  <div className="lms-tabs">
                    <button
                      className={`lms-tab${mode === "preview" ? " is-on" : ""}`}
                      onClick={() => setMode("preview")}
                    >
                      Preview
                    </button>
                    <button
                      className={`lms-tab${mode === "edit" ? " is-on" : ""}`}
                      onClick={() => {
                        setMode("edit");
                        setEditText(JSON.stringify(d.lesson, null, 2));
                        setEditError("");
                      }}
                    >
                      Edit JSON
                    </button>
                  </div>

                  {mode === "preview" ? (
                    <div className="lms-draft-preview">
                      <p className="unit-blurb">{d.lesson.hook}</p>
                      <article className="lms-lesson">
                        {(d.lesson.blocks as LessonBlock[]).map((b, i) => (
                          <Block key={i} block={b} />
                        ))}
                      </article>
                      <h3 className="lms-draft-h">Knowledge check</h3>
                      {d.lesson.quiz.map((q, i) => (
                        <div key={i} className="lms-draft-q">
                          <p className="lms-draft-qq">
                            {i + 1}. {q.q}
                          </p>
                          <ul className="lms-draft-opts">
                            {q.options.map((o, oi) => (
                              <li key={oi} className={oi === q.answer ? "is-right" : ""}>
                                {String.fromCharCode(65 + oi)}. {o}
                                {oi === q.answer && " ✓"}
                              </li>
                            ))}
                          </ul>
                          <p className="lms-draft-explain">{q.explain}</p>
                        </div>
                      ))}
                      <h3 className="lms-draft-h">Flashcards</h3>
                      {d.lesson.cards.map((c, i) => (
                        <p key={i} className="lms-draft-card">
                          <strong>{c.front}</strong>: {c.back}
                        </p>
                      ))}
                      <h3 className="lms-draft-h">Field Work</h3>
                      <p className="lms-draft-card">{d.lesson.action}</p>
                    </div>
                  ) : (
                    <div className="lms-draft-edit">
                      <textarea
                        className="lms-notes lms-draft-json"
                        rows={20}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        spellCheck={false}
                      />
                      {editError && (
                        <p className="lms-login-error" role="alert">
                          {editError}
                        </p>
                      )}
                      <button
                        className="btn btn--solid lms-login-btn"
                        onClick={() => void saveEdit(d.id)}
                      >
                        Save the Draft
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </section>
      )}
    </>
  );
}
