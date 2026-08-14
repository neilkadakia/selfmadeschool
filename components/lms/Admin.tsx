"use client";

// Faculty lounge — admin-only: manage students, see newsletter signups,
// change your own password. Everything runs on the existing API.

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  apiUsersList,
  apiUserCreate,
  apiNewsletterList,
  apiChangePassword,
  apiFeedbackList,
  apiFeedbackModerate,
  apiClassOverview,
  apiBulletinList,
  apiBulletinPost,
  apiBulletinDelete,
  apiBackupInfo,
  apiBackupRun,
} from "@/lib/api";
import { COURSES, courseUnits } from "@/lib/lms";
import { useLms } from "@/components/useLms";

type Student = { email: string; name: string; role: string };
type Subscriber = { email: string; created: string; source: string };
type Quote = {
  id: string;
  text: string;
  name: string;
  email?: string;
  context: string;
  created: string;
  approved: boolean;
};
type ClassRow = {
  email: string;
  name: string;
  role: string;
  units: number;
  xp: number;
  streak: number;
  badges: number;
  finals: number;
  lastActive: string;
  done?: Record<string, string[]>;
};
type Note = { id: string; text: string; author: string; created: string };

export default function Admin() {
  const lms = useLms();
  const token = lms.auth?.token ?? "";
  const isAdmin = lms.auth?.role === "admin";

  const [students, setStudents] = useState<Student[] | null>(null);
  const [subs, setSubs] = useState<Subscriber[] | null>(null);
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [classRows, setClassRows] = useState<ClassRow[] | null>(null);
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [noteText, setNoteText] = useState("");
  const [cronUrl, setCronUrl] = useState("");
  const [msg, setMsg] = useState("");

  // Create-student form
  const [nName, setNName] = useState("");
  const [nEmail, setNEmail] = useState("");
  const [nPass, setNPass] = useState("");

  // Change-password form
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNext, setPwNext] = useState("");

  useEffect(() => {
    if (!token || !isAdmin) return;
    void apiUsersList(token).then((r) => {
      if (r.ok) setStudents(r.data.users as Student[]);
    });
    void apiNewsletterList(token).then((r) => {
      if (r.ok) setSubs(r.data.subscribers as Subscriber[]);
    });
    void apiFeedbackList(token).then((r) => {
      if (r.ok) setQuotes(r.data.quotes as Quote[]);
    });
    void apiClassOverview(token).then((r) => {
      if (r.ok) setClassRows(r.data.students as ClassRow[]);
    });
    void apiBulletinList(token).then((r) => {
      if (r.ok) setNotes(r.data.notes as Note[]);
    });
    void apiBackupInfo(token).then((r) => {
      if (r.ok) setCronUrl(r.data.cronUrl as string);
    });
  }, [token, isAdmin]);

  if (!lms.loaded) return <div className="learn" />;

  if (!isAdmin) {
    return (
      <div className="learn">
        <div className="learn-wrap lms-gate">
          <Link href="/learn" className="crumb">
            ← My Learning
          </Link>
          <p className="kicker kicker--coral">Faculty Lounge</p>
          <h1 className="learn-h1">Faculty only.</h1>
          <p className="learn-sub">This page is for school staff. Your class is right back there.</p>
          <Link href="/learn" className="btn btn--solid">
            Back to Class →
          </Link>
        </div>
      </div>
    );
  }

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(""), 4000);
  };

  const createStudent = async (e: FormEvent) => {
    e.preventDefault();
    const res = await apiUserCreate(token, { email: nEmail.trim(), password: nPass, name: nName.trim() });
    if (res.ok) {
      flash(`Account created for ${nEmail.trim()}.`);
      setNName("");
      setNEmail("");
      setNPass("");
      const r = await apiUsersList(token);
      if (r.ok) setStudents(r.data.users as Student[]);
    } else {
      flash((res.data.error as string) ?? "Could not create the account.");
    }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    const res = await apiChangePassword(token, pwCurrent, pwNext);
    if (res.ok) {
      flash("Password changed.");
      setPwCurrent("");
      setPwNext("");
    } else {
      flash((res.data.error as string) ?? "Could not change the password.");
    }
  };

  const postNote = async (e: FormEvent) => {
    e.preventDefault();
    const res = await apiBulletinPost(token, noteText.trim());
    if (res.ok) {
      flash("Pinned to the bulletin.");
      setNoteText("");
      const r = await apiBulletinList(token);
      if (r.ok) setNotes(r.data.notes as Note[]);
    } else {
      flash((res.data.error as string) ?? "Could not pin the note.");
    }
  };

  const copyEmails = () => {
    if (!subs?.length) return;
    void navigator.clipboard.writeText(subs.map((s) => s.email).join(", ")).then(() => flash("Emails copied to clipboard."));
  };

  return (
    <div className="learn">
      <div className="learn-wrap">
        <Link href="/learn" className="crumb">
          ← My Learning
        </Link>
        <p className="kicker kicker--coral">Faculty Lounge</p>
        <h1 className="learn-h1">Run the school.</h1>
        {msg && (
          <p className="lms-admin-flash" role="status">
            {msg}
          </p>
        )}

        <section className="lms-section">
          <h2 className="lms-section-h">Class progress</h2>
          <p className="lms-section-sub">
            Every student&apos;s synced state, ranked by XP. The dot strip is the training matrix —
            one dot per unit in the catalog, filled when it&apos;s done.
          </p>
          {classRows && classRows.length > 0 && (
            <div className="lms-admin-table lms-classbook">
              <div className="lms-admin-row lms-classbook-head">
                <span>Student</span>
                <span>Units</span>
                <span>XP</span>
                <span>Streak</span>
                <span>Badges</span>
                <span>Last active</span>
              </div>
              {classRows.map((r) => (
                <div key={r.email} className="lms-classbook-item">
                  <div className="lms-admin-row lms-classbook-row">
                    <span className="lms-admin-name" title={r.email}>
                      {r.name || r.email}
                    </span>
                    <span>{r.units}</span>
                    <span>{r.xp}</span>
                    <span>{r.streak}d</span>
                    <span>{r.badges}</span>
                    <span className="lms-admin-meta">{r.lastActive ? r.lastActive.slice(0, 10) : "—"}</span>
                  </div>
                  <div className="lms-matrix">
                    {COURSES.map((c) => {
                      const dc = r.done?.[c.slug] ?? [];
                      return (
                        <span key={c.slug} className="lms-matrix-course">
                          {courseUnits(c).map((u) => (
                            <span
                              key={u.slug}
                              className={`lms-matrix-cell${
                                dc.includes(u.slug) ? ` is-done fill--${c.tone}` : ""
                              }`}
                              title={`${c.title} · ${u.title}`}
                            />
                          ))}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="lms-section">
          <h2 className="lms-section-h">Homeroom Bulletin</h2>
          <p className="lms-section-sub">
            Pin a note and every student sees it at the top of their dashboard. Keep it short —
            it reads like a note on the classroom door.
          </p>
          {notes && notes.length > 0 && (
            <div className="lms-admin-table">
              {notes.map((n) => (
                <div key={n.id} className="lms-admin-row lms-bulletin-row">
                  <span className="lms-admin-name">{n.text}</span>
                  <span className="lms-admin-meta">{n.created.slice(0, 10)}</span>
                  <button
                    className="lms-signout"
                    onClick={async () => {
                      const r = await apiBulletinDelete(token, n.id);
                      if (r.ok) {
                        setNotes((prev) => prev!.filter((x) => x.id !== n.id));
                        flash("Note taken down.");
                      }
                    }}
                  >
                    Take Down
                  </button>
                </div>
              ))}
            </div>
          )}
          <form className="lms-admin-form" onSubmit={postNote}>
            <textarea
              className="lms-cert-name lms-bulletin-input"
              placeholder="Note for the whole class (3–500 characters)"
              required
              minLength={3}
              maxLength={500}
              rows={3}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <button className="btn btn--solid lms-login-btn" type="submit">
              Pin to the Bulletin
            </button>
          </form>
        </section>

        <section className="lms-section">
          <h2 className="lms-section-h">Students</h2>
          <p className="lms-section-sub">
            {students ? `${students.length} account${students.length === 1 ? "" : "s"}.` : "Loading…"}{" "}
            Invites are manual while the school is in closed session.
          </p>
          {students && (
            <div className="lms-admin-table">
              {students.map((s) => (
                <div key={s.email} className="lms-admin-row">
                  <span className="lms-admin-name">{s.name}</span>
                  <span className="lms-admin-email">{s.email}</span>
                  <span className={`pill ${s.role === "admin" ? "pill--acc" : "row-pill--dim"}`}>
                    {s.role}
                  </span>
                </div>
              ))}
            </div>
          )}
          <form className="lms-admin-form" onSubmit={createStudent}>
            <input
              className="lms-cert-name"
              placeholder="Full name"
              required
              value={nName}
              onChange={(e) => setNName(e.target.value)}
            />
            <input
              className="lms-cert-name"
              type="email"
              placeholder="email@example.com"
              required
              value={nEmail}
              onChange={(e) => setNEmail(e.target.value)}
            />
            <input
              className="lms-cert-name"
              type="text"
              placeholder="Password (10+ characters)"
              required
              minLength={10}
              value={nPass}
              onChange={(e) => setNPass(e.target.value)}
            />
            <button className="btn btn--solid lms-login-btn" type="submit">
              Create Student Account
            </button>
          </form>
        </section>

        <section className="lms-section">
          <h2 className="lms-section-h">Extra Credit list</h2>
          <p className="lms-section-sub">
            {subs ? `${subs.length} subscriber${subs.length === 1 ? "" : "s"}.` : "Loading…"}
          </p>
          {subs && subs.length > 0 && (
            <>
              <div className="lms-admin-table">
                {subs.map((s) => (
                  <div key={s.email} className="lms-admin-row">
                    <span className="lms-admin-email">{s.email}</span>
                    <span className="lms-admin-meta">{s.source}</span>
                    <span className="lms-admin-meta">{s.created.slice(0, 10)}</span>
                  </div>
                ))}
              </div>
              <button className="btn btn--outline lms-login-btn lms-admin-copy" onClick={copyEmails}>
                Copy All Emails
              </button>
            </>
          )}
        </section>

        <section className="lms-section">
          <h2 className="lms-section-h">Student quotes</h2>
          <p className="lms-section-sub">
            {quotes ? `${quotes.length} submitted.` : "Loading…"} Approved quotes appear on the
            homepage with the student&apos;s first name.
          </p>
          {quotes && quotes.length > 0 && (
            <div className="lms-admin-quotes">
              {quotes.map((q) => (
                <div key={q.id} className={`lms-admin-quote${q.approved ? " is-live" : ""}`}>
                  <p className="lms-admin-quote-text">&quot;{q.text}&quot;</p>
                  <p className="lms-admin-meta">
                    {q.name} ({q.email}) · {q.context} · {q.created.slice(0, 10)}
                    {q.approved && " · LIVE ON HOMEPAGE"}
                  </p>
                  <div className="lms-admin-quote-actions">
                    <button
                      className="lms-signout"
                      onClick={async () => {
                        const action = q.approved ? "unapprove" : "approve";
                        const r = await apiFeedbackModerate(token, q.id, action);
                        if (r.ok) {
                          setQuotes((prev) =>
                            prev!.map((x) => (x.id === q.id ? { ...x, approved: !q.approved } : x))
                          );
                          flash(action === "approve" ? "Quote is live on the homepage." : "Quote taken down.");
                        }
                      }}
                    >
                      {q.approved ? "Take Down" : "Approve"}
                    </button>
                    <button
                      className="lms-signout"
                      onClick={async () => {
                        const r = await apiFeedbackModerate(token, q.id, "delete");
                        if (r.ok) {
                          setQuotes((prev) => prev!.filter((x) => x.id !== q.id));
                          flash("Quote deleted.");
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="lms-section">
          <h2 className="lms-section-h">School ops</h2>
          <p className="lms-section-sub">
            Backups zip every data store into <code>sms-lms-backups/</code> next to the data
            folder — newest 14 kept. For a nightly run, add a cron job in Hostinger&apos;s hPanel
            (Advanced → Cron Jobs) with the command below. For uptime, point a free monitor
            (e.g. UptimeRobot) at <code>/api/health.php</code>.
          </p>
          {cronUrl && (
            <div className="lms-ops-cron">
              <code>curl -s &quot;{cronUrl}&quot; &gt; /dev/null</code>
              <button
                className="lms-signout"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(`curl -s "${cronUrl}" > /dev/null`)
                    .then(() => flash("Cron command copied."));
                }}
              >
                Copy
              </button>
            </div>
          )}
          <button
            className="btn btn--outline lms-login-btn"
            onClick={async () => {
              const r = await apiBackupRun(token);
              if (r.ok) {
                flash(`Backup saved: ${r.data.file as string} (${r.data.stores as number} stores).`);
              } else {
                flash((r.data.error as string) ?? "Backup failed.");
              }
            }}
          >
            Run Backup Now
          </button>
        </section>

        <section className="lms-section lms-gate">
          <h2 className="lms-section-h">Your password</h2>
          <form className="lms-admin-form" onSubmit={changePassword}>
            <input
              className="lms-cert-name"
              type="password"
              placeholder="Current password"
              autoComplete="current-password"
              required
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
            />
            <input
              className="lms-cert-name"
              type="password"
              placeholder="New password (10+ characters)"
              autoComplete="new-password"
              required
              minLength={10}
              value={pwNext}
              onChange={(e) => setPwNext(e.target.value)}
            />
            <button className="btn btn--outline lms-login-btn" type="submit">
              Change Password
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
