"use client";

// One student, everything. Opens as a drawer over whatever room you were
// in, because the question "who is this person" almost always arrives in
// the middle of doing something else, and losing your place to answer it
// is how an admin panel starts to feel like work.
//
// Five tabs, in the order a teacher asks the questions: how are they doing,
// what have they done in the real world, what have they said, what have we
// told them to do, and what do we know that they should not see.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_LABEL, ROLE_RANK, rankOf, type Role } from "@/lib/api";
import { usDate, formatPhone } from "@/lib/format";
import {
  ago,
  assignClose,
  assignDrop,
  facStudent,
  noteDelete,
  noteWrite,
  nudgePersonal,
  type StudentFile as FileData,
} from "@/lib/faculty";
import { useLms } from "@/components/useLms";
import { Empty, Meter, Skeleton, Tabs, Tag } from "./ui";
import ReplyBox from "./ReplyBox";
import AssignBox from "./AssignBox";

type Tab = "progress" | "fieldwork" | "voice" | "assigned" | "notes";

export default function StudentFile({
  email,
  onClose,
  onChange,
  flash,
}: {
  email: string;
  onClose: () => void;
  onChange?: () => void;
  flash: (t: string) => void;
}) {
  const lms = useLms();
  const router = useRouter();
  const token = lms.auth?.token ?? "";
  const myRank = rankOf(lms.auth?.role);
  const [data, setData] = useState<FileData | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("progress");
  const [replying, setReplying] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [nudging, setNudging] = useState(false);
  const [nudgeText, setNudgeText] = useState("");

  const load = () => {
    if (!token) return;
    void facStudent(token, email).then((r) => {
      if (r.ok) setData(r.data as unknown as FileData);
      else setError((r.data.error as string) ?? "Could not open that file.");
    });
  };

  useEffect(load, [token, email]);

  // Escape closes, and the page behind stops scrolling while it's open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const refresh = () => {
    load();
    onChange?.();
  };

  const body = () => {
    if (error) return <Empty title="Could not open that file.">{error}</Empty>;
    if (!data) return <Skeleton rows={6} />;

    const s = data.student;
    const firstName = (s.first || s.name || s.email).split(" ")[0];

    if (tab === "progress") {
      return (
        <>
          <div className="fac-pulse" style={{ marginBottom: 24 }}>
            <div className="fac-stat">
              <span className="fac-stat-n">{data.stats.xp.toLocaleString()}</span>
              <span className="fac-stat-l">XP</span>
            </div>
            <div className="fac-stat">
              <span className="fac-stat-n">{data.stats.streak}</span>
              <span className="fac-stat-l">Day streak</span>
            </div>
            <div className="fac-stat">
              <span className="fac-stat-n">{data.stats.badges.length}</span>
              <span className="fac-stat-l">Badges</span>
            </div>
            <div className="fac-stat">
              <span className="fac-stat-n">{data.fieldwork.length}</span>
              <span className="fac-stat-l">Field Work</span>
            </div>
          </div>

          {data.courses.map((c) => (
            <div key={c.slug} className="fac-course">
              <div className="fac-course-top">
                <span className="fac-course-name">{c.title}</span>
                <span className="fac-muted fac-num">
                  {c.done}/{c.total} units
                  {c.final && (
                    <>
                      {" · "}
                      <span className={c.final.passed ? "fac-good" : "fac-warn"}>
                        Final {c.final.score}/{c.final.total}
                      </span>
                    </>
                  )}
                </span>
              </div>
              <Meter pct={c.pct} tone={c.tone} />
              <div className="fac-matrix" style={{ marginTop: 10 }}>
                <span className="fac-matrix-course">
                  {c.units.map((u) => (
                    <span
                      key={u.slug}
                      className={`fac-matrix-cell${!u.taught ? " is-untaught" : u.done ? ` is-done tone-${c.tone}` : ""}`}
                      title={`${u.title}${!u.taught ? " (not written yet)" : u.done ? " — done" : " — not started"}`}
                    />
                  ))}
                </span>
              </div>
            </div>
          ))}
          {data.courses.every((c) => c.done === 0) && (
            <p className="fac-hint" style={{ marginTop: 16 }}>
              {firstName} has not finished a unit yet. The dots fill in as they go.
            </p>
          )}
        </>
      );
    }

    if (tab === "fieldwork") {
      if (data.fieldwork.length === 0) {
        return (
          <Empty title="No Field Work filed yet.">
            Field Work is the unit&apos;s real-world action. Filings show up here with room to answer.
          </Empty>
        );
      }
      return (
        <>
          {data.fieldwork.map((f) => (
            <article key={f.key} className="fac-item" style={{ paddingLeft: 0, paddingRight: 0 }}>
              <div className="fac-item-top">
                <span style={{ fontWeight: 700, fontSize: "14.5px" }}>{f.unitTitle}</span>
                <span className="fac-where">{f.courseTitle}</span>
                <span className="fac-when">{f.date ? usDate(f.date) : ""}</span>
              </div>
              {f.action && <p className="fac-asked">Asked: {f.action}</p>}
              {f.note ? (
                <p className="fac-said">{f.note}</p>
              ) : (
                <p className="fac-hint">Filed without a note. They did it, they just did not write about it.</p>
              )}

              {f.reply && replying !== f.key && (
                <div className="fac-answer">
                  <p className="fac-answer-by">{f.reply.byName} answered</p>
                  <p className="fac-answer-text">{f.reply.text}</p>
                  <p className="fac-answer-seen">
                    {usDate(f.reply.at)} · {f.reply.seen ? "Read" : "Not read yet"}
                  </p>
                </div>
              )}

              {replying === f.key ? (
                <ReplyBox
                  token={token}
                  email={email}
                  unitKey={f.key}
                  name={s.name}
                  initial={f.reply?.text ?? ""}
                  onDone={() => {
                    setReplying(null);
                    refresh();
                    flash(`Answered ${firstName}.`);
                  }}
                  onCancel={() => setReplying(null)}
                />
              ) : (
                f.note && (
                  <div className="fac-item-actions">
                    <button
                      className={`fac-btn fac-btn--sm${f.reply ? "" : " fac-btn--go"}`}
                      onClick={() => setReplying(f.key)}
                    >
                      {f.reply ? "Edit the Answer" : "Write Back"}
                    </button>
                  </div>
                )
              )}
            </article>
          ))}
        </>
      );
    }

    if (tab === "voice") {
      if (data.posts.length === 0) {
        return (
          <Empty title="Has not posted in the Study Group.">
            Quiet is not the same as absent. The progress tab is the better read.
          </Empty>
        );
      }
      return (
        <>
          {data.posts.map((p) => (
            <article key={p.id} className="fac-item" style={{ paddingLeft: 0, paddingRight: 0 }}>
              <div className="fac-item-top">
                <span className="fac-where">{p.unitTitle}</span>
                {p.endorsed && <Tag tone="acc">Faculty answer</Tag>}
                <span className="fac-when">{ago(p.created)}</span>
              </div>
              <p className="fac-said">{p.text}</p>
              <div className="fac-item-actions">
                <Link href={`/learn/${p.course}/${p.unit}/`} className="fac-btn fac-btn--sm fac-btn--quiet">
                  Open the Thread
                </Link>
                {p.ups > 0 && <span className="fac-hint">{p.ups} upvotes</span>}
              </div>
            </article>
          ))}
        </>
      );
    }

    if (tab === "assigned") {
      return (
        <>
          {assigning ? (
            <AssignBox
              token={token}
              email={email}
              name={s.name}
              onDone={() => {
                setAssigning(false);
                refresh();
                flash(`Sent ${firstName} something to work on.`);
              }}
              onCancel={() => setAssigning(false)}
            />
          ) : (
            <button className="fac-btn fac-btn--go" onClick={() => setAssigning(true)}>
              Point Them at a Unit
            </button>
          )}

          {data.assignments.length === 0 ? (
            <div style={{ marginTop: 18 }}>
              <Empty title="Nothing assigned.">
                Pointing somebody at a specific unit puts it on their desk with your name and your note on it.
              </Empty>
            </div>
          ) : (
            <div style={{ marginTop: 18 }}>
              {data.assignments.map((a) => (
                <article key={a.id} className="fac-item" style={{ paddingLeft: 0, paddingRight: 0 }}>
                  <div className="fac-item-top">
                    <span style={{ fontWeight: 700, fontSize: "14.5px" }}>
                      {a.unitTitle || a.courseTitle}
                    </span>
                    {a.done && <Tag tone="acc">Done</Tag>}
                    {a.overdue && <Tag tone="coral">Past due</Tag>}
                    <span className="fac-when">
                      {a.due ? `due ${usDate(a.due)}` : ago(a.created)}
                    </span>
                  </div>
                  {a.note && <p className="fac-said">{a.note}</p>}
                  <div className="fac-item-actions">
                    <span className="fac-hint">Set by {a.byName}</span>
                    <button
                      className="fac-btn fac-btn--sm fac-btn--quiet"
                      onClick={async () => {
                        await assignClose(token, email, a.id, !a.done);
                        refresh();
                      }}
                    >
                      {a.done ? "Reopen" : "Mark Done"}
                    </button>
                    <button
                      className="fac-btn fac-btn--sm fac-btn--quiet fac-btn--danger"
                      onClick={async () => {
                        await assignDrop(token, email, a.id);
                        refresh();
                        flash("Withdrawn.");
                      }}
                    >
                      Withdraw
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      );
    }

    // notes
    return (
      <>
        <p className="fac-hint" style={{ marginBottom: 12 }}>
          Staff room only. {firstName} never sees any of this, and it is not in any export a student can reach.
        </p>
        <textarea
          className="fac-textarea"
          rows={3}
          maxLength={2000}
          placeholder={`Something worth remembering about ${firstName}.`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="fac-item-actions">
          <button
            className="fac-btn fac-btn--sm fac-btn--go"
            disabled={note.trim().length < 2}
            onClick={async () => {
              const r = await noteWrite(token, email, note.trim());
              if (r.ok) {
                setNote("");
                refresh();
              } else {
                flash((r.data.error as string) ?? "Could not save that.");
              }
            }}
          >
            Save the Note
          </button>
        </div>

        <div style={{ marginTop: 20 }}>
          {data.notes.length === 0 ? (
            <Empty title="No notes yet." />
          ) : (
            data.notes.map((n) => (
              <article key={n.id} className="fac-item" style={{ paddingLeft: 0, paddingRight: 0 }}>
                <div className="fac-item-top">
                  <span className="fac-where">{n.byName}</span>
                  <span className="fac-when">{usDate(n.at)}</span>
                </div>
                <p className="fac-said" style={{ borderLeftColor: "rgba(242,238,227,0.2)" }}>
                  {n.text}
                </p>
                {(n.mine || myRank >= ROLE_RANK.global_admin) && (
                  <div className="fac-item-actions">
                    <button
                      className="fac-btn fac-btn--sm fac-btn--quiet fac-btn--danger"
                      onClick={async () => {
                        await noteDelete(token, email, n.id);
                        refresh();
                      }}
                    >
                      Tear Up
                    </button>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </>
    );
  };

  const s = data?.student;
  const canActAs = s && myRank > rankOf(s.role) && s.email !== lms.auth?.email;

  return (
    <>
      <button className="fac-scrim" aria-label="Close the file" onClick={onClose} />
      <aside className="fac-drawer" role="dialog" aria-modal="true" aria-label="Student File">
        <header className="fac-drawer-head">
          <div className="fac-drawer-top">
            <div>
              <h2 className="fac-drawer-name">{s?.name || email}</h2>
              <p className="fac-drawer-meta">
                {email}
                {s?.phone ? ` · ${formatPhone(s.phone)}` : ""}
                <br />
                {s?.role && s.role !== "student" && <>{ROLE_LABEL[s.role as Role]} · </>}
                Joined {s?.joined ? usDate(s.joined) : "·"} · Last seen {s ? ago(s.lastActive) : "·"}
                {s && !s.nudges && " · School email off"}
              </p>
            </div>
            <button className="fac-close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>

          <div className="fac-head-actions" style={{ marginTop: 14 }}>
            {s?.nudges !== false && (
              <button className="fac-btn fac-btn--sm" onClick={() => setNudging((v) => !v)}>
                Send a Note
              </button>
            )}
            {canActAs && (
              <button
                className="fac-btn fac-btn--sm"
                onClick={async () => {
                  const r = await lms.actAs(email);
                  if (r.ok) router.push("/learn");
                  else flash(r.error ?? "Could not act as that account.");
                }}
              >
                Act As
              </button>
            )}
          </div>

          {nudging && (
            <div className="fac-compose">
              <textarea
                className="fac-textarea"
                rows={3}
                maxLength={1500}
                placeholder={`An email straight to ${(s?.first || s?.name || "them").split(" ")[0]}. Says it came from you.`}
                value={nudgeText}
                onChange={(e) => setNudgeText(e.target.value)}
              />
              <div className="fac-item-actions">
                <button
                  className="fac-btn fac-btn--sm fac-btn--go"
                  disabled={nudgeText.trim().length < 5}
                  onClick={async () => {
                    const r = await nudgePersonal(token, email, "", nudgeText.trim());
                    if (r.ok) {
                      setNudgeText("");
                      setNudging(false);
                      flash("Sent.");
                    } else {
                      flash((r.data.error as string) ?? "Could not send that.");
                    }
                  }}
                >
                  Send the Email
                </button>
                <button className="fac-btn fac-btn--sm fac-btn--quiet" onClick={() => setNudging(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="fac-drawer-tabs">
            <Tabs<Tab>
              value={tab}
              onChange={setTab}
              options={[
                { id: "progress", label: "Progress" },
                { id: "fieldwork", label: "Field Work", count: data?.fieldwork.length },
                { id: "voice", label: "Study Group", count: data?.posts.length },
                { id: "assigned", label: "Assigned", count: data?.assignments.filter((a) => !a.done).length },
                { id: "notes", label: "Notes", count: data?.notes.length },
              ]}
            />
          </div>
        </header>

        <div className="fac-drawer-body">{body()}</div>
      </aside>
    </>
  );
}
