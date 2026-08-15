"use client";

// Study Group — the unit's discussion thread. Students ask, answer, and
// upvote; faculty pin the good answers with an "endorsed" mark. Lives at
// the bottom of every unit so the class is in the room with you.

import { useEffect, useState, type FormEvent } from "react";
import { apiDiscussList, apiDiscussPost, apiDiscussAct, isFaculty, type DiscussPost } from "@/lib/api";
import { usDate } from "@/lib/format";
import { useLms } from "@/components/useLms";

type Props = { course: string; unit: string };

export default function StudyGroup({ course, unit }: Props) {
  const lms = useLms();
  const token = lms.auth?.token ?? "";
  const faculty = isFaculty(lms.auth?.role);
  const [posts, setPosts] = useState<DiscussPost[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    void apiDiscussList(token, course, unit).then((r) => {
      if (r.ok && Array.isArray(r.data.posts)) {
        setPosts(r.data.posts as DiscussPost[]);
        setOffline(false);
      } else if (r.status === 0) {
        setOffline(true);
      }
    });
  };

  useEffect(() => {
    if (!token) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, course, unit]);

  if (!token) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || text.trim().length < 3) return;
    setBusy(true);
    setError("");
    const r = await apiDiscussPost(token, course, unit, text.trim());
    setBusy(false);
    if (r.ok) {
      setText("");
      load();
    } else {
      setError((r.data.error as string) ?? "Could not post that — try again.");
    }
  };

  const act = async (action: "upvote" | "endorse" | "unendorse" | "delete", id: string) => {
    const r = await apiDiscussAct(token, action, id);
    if (r.ok) load();
  };

  return (
    <section className="lms-section" aria-label="Study Group">
      <h2 className="lms-section-h">Study Group</h2>
      <p className="lms-section-sub">
        Ask, answer, compare notes — the class is in here with you. Faculty mark the answers worth
        keeping.
      </p>

      {offline && <p className="lms-muted">The Study Group needs a connection — it&apos;ll be here when you&apos;re back.</p>}

      {posts && posts.length === 0 && (
        <p className="lms-muted">Nobody&apos;s said anything yet. Be the first — someone&apos;s stuck on exactly what you just figured out.</p>
      )}

      {posts && posts.length > 0 && (
        <div className="lms-sg">
          {posts.map((p) => (
            <div key={p.id} className={`lms-sg-post${p.endorsed ? " is-endorsed" : ""}`}>
              <div className="lms-sg-head">
                <span className="lms-sg-name">
                  {p.name}
                  {p.endorsed && <span className="lms-sg-badge">Faculty answer ✓</span>}
                </span>
                <span className="lms-sg-date">{usDate(p.created)}</span>
              </div>
              <p className="lms-sg-text">{p.text}</p>
              <div className="lms-sg-actions">
                <button
                  className={`lms-sg-up${p.youUp ? " is-on" : ""}`}
                  disabled={p.mine}
                  aria-pressed={p.youUp}
                  onClick={() => void act("upvote", p.id)}
                >
                  ▲ {p.ups}
                </button>
                {faculty && (
                  <button
                    className="lms-sg-mod"
                    onClick={() => void act(p.endorsed ? "unendorse" : "endorse", p.id)}
                  >
                    {p.endorsed ? "Unendorse" : "Endorse"}
                  </button>
                )}
                {(p.mine || faculty) && (
                  <button className="lms-sg-mod" onClick={() => void act("delete", p.id)}>
                    Take Down
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!offline && (
        <form className="lms-sg-form" onSubmit={submit}>
          <textarea
            className="lms-notes"
            rows={2}
            maxLength={500}
            placeholder={"Stuck on something? Figured something out? Say it here."}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {error && (
            <p className="lms-login-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn--outline lms-login-btn" type="submit" disabled={busy}>
            {busy ? "Posting…" : "Post to the Class"}
          </button>
        </form>
      )}
    </section>
  );
}
