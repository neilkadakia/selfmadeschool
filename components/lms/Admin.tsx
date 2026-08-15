"use client";

// The Faculty Lounge, organized by role instead of stacked:
//   Classroom    (educator+)      — class progress, homeroom bulletin
//   Front Office (administrator+) — accounts, Act As, newsletter, quotes
//   School Ops   (global admin)   — backups, cron, role changes
// The server enforces every rank; the tabs just keep the room tidy.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  ROLE_LABEL,
  ROLE_RANK,
  rankOf,
  isFaculty,
  apiUsersList,
  apiUserCreate,
  apiSetRole,
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
  apiNudgeInfo,
  apiNudgeRun,
  type Role,
} from "@/lib/api";
import { COURSES, courseUnits } from "@/lib/lms";
import { formatPhone, formatPhoneInput, usDate } from "@/lib/format";
import { useLms } from "@/components/useLms";

type Student = { email: string; name: string; phone?: string; dob?: string; role: Role };
type Subscriber = { email: string; created: string; source: string };
type Quote = {
  id: string;
  text: string;
  name: string;
  email?: string;
  context: string;
  rating?: number;
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

const ROLE_PILL: Record<Role, string> = {
  global_admin: "pill row-pill--coral",
  admin: "pill pill--acc",
  educator: "pill row-pill--vio",
  student: "pill row-pill--dim",
};

const TABS = [
  { id: "classroom" as const, label: "Classroom", min: ROLE_RANK.educator },
  { id: "office" as const, label: "Front Office", min: ROLE_RANK.admin },
  { id: "ops" as const, label: "School Ops", min: ROLE_RANK.global_admin },
];

export default function Admin() {
  const lms = useLms();
  const router = useRouter();
  const token = lms.auth?.token ?? "";
  const myRank = rankOf(lms.auth?.role);
  const faculty = isFaculty(lms.auth?.role);

  const [tab, setTab] = useState<"classroom" | "office" | "ops">("classroom");
  const [students, setStudents] = useState<Student[] | null>(null);
  const [subs, setSubs] = useState<Subscriber[] | null>(null);
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [classRows, setClassRows] = useState<ClassRow[] | null>(null);
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [noteText, setNoteText] = useState("");
  const [cronUrl, setCronUrl] = useState("");
  const [nudgeCron, setNudgeCron] = useState("");
  const [msg, setMsg] = useState("");

  // Create-account form
  const [nFirst, setNFirst] = useState("");
  const [nLast, setNLast] = useState("");
  const [nEmail, setNEmail] = useState("");
  const [nPhone, setNPhone] = useState("");
  const [nDob, setNDob] = useState("");
  const [nPass, setNPass] = useState("");
  const [nRole, setNRole] = useState<Role>("student");

  // Change-password form
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNext, setPwNext] = useState("");

  useEffect(() => {
    if (!token || myRank < ROLE_RANK.educator) return;
    void apiClassOverview(token).then((r) => {
      if (r.ok) setClassRows(r.data.students as ClassRow[]);
    });
    void apiBulletinList(token).then((r) => {
      if (r.ok) setNotes(r.data.notes as Note[]);
    });
    void apiUsersList(token).then((r) => {
      if (r.ok) setStudents(r.data.users as Student[]);
    });
    if (myRank >= ROLE_RANK.admin) {
      void apiNewsletterList(token).then((r) => {
        if (r.ok) setSubs(r.data.subscribers as Subscriber[]);
      });
      void apiFeedbackList(token).then((r) => {
        if (r.ok) setQuotes(r.data.quotes as Quote[]);
      });
    }
    if (myRank >= ROLE_RANK.global_admin) {
      void apiBackupInfo(token).then((r) => {
        if (r.ok) setCronUrl(r.data.cronUrl as string);
      });
      void apiNudgeInfo(token).then((r) => {
        if (r.ok) setNudgeCron(r.data.cronUrl as string);
      });
    }
  }, [token, myRank]);

  if (!lms.loaded) return <div className="learn" />;

  if (!faculty) {
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

  const refreshRoster = async () => {
    const r = await apiUsersList(token);
    if (r.ok) setStudents(r.data.users as Student[]);
  };

  const createAccount = async (e: FormEvent) => {
    e.preventDefault();
    const res = await apiUserCreate(token, {
      email: nEmail.trim(),
      password: nPass,
      first: nFirst.trim(),
      last: nLast.trim(),
      phone: nPhone.trim(),
      dob: nDob,
      role: nRole,
    });
    if (res.ok) {
      flash(`${ROLE_LABEL[nRole]} account created for ${nEmail.trim()}.`);
      setNFirst("");
      setNLast("");
      setNEmail("");
      setNPhone("");
      setNDob("");
      setNPass("");
      setNRole("student");
      void refreshRoster();
    } else {
      flash((res.data.error as string) ?? "Could not create the account.");
    }
  };

  const actAs = async (email: string) => {
    const r = await lms.actAs(email);
    if (r.ok) {
      router.push("/learn");
    } else {
      flash(r.error ?? "Could not act as that account.");
    }
  };

  const changeRole = async (email: string, role: Role) => {
    const r = await apiSetRole(token, email, role);
    if (r.ok) {
      flash(`${email} is now ${ROLE_LABEL[role]}.`);
      void refreshRoster();
    } else {
      flash((r.data.error as string) ?? "Could not change the role.");
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

  const visibleTabs = TABS.filter((t) => myRank >= t.min);

  return (
    <div className="learn">
      <div className="learn-wrap">
        <Link href="/learn" className="crumb">
          ← My Learning
        </Link>
        <p className="kicker kicker--coral">Faculty Lounge</p>
        <h1 className="learn-h1">Run the school.</h1>
        <p className="learn-sub">
          Signed in as {lms.auth?.name || lms.auth?.email} ·{" "}
          {ROLE_LABEL[(lms.auth?.role ?? "student") as Role]}
        </p>

        {visibleTabs.length > 1 && (
          <div className="lms-tabbar" role="tablist" aria-label="Faculty Lounge sections">
            {visibleTabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={`lms-tab${tab === t.id ? " is-on" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {msg && (
          <p className="lms-admin-flash" role="status">
            {msg}
          </p>
        )}

        {tab === "classroom" && (
          <>
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
                        <span data-k="Units">{r.units}</span>
                        <span data-k="XP">{r.xp}</span>
                        <span data-k="Streak">{r.streak}d</span>
                        <span data-k="Badges">{r.badges}</span>
                        <span data-k="Last" className="lms-admin-meta">
                          {r.lastActive ? usDate(r.lastActive) : "—"}
                        </span>
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
                      <span className="lms-admin-meta">{usDate(n.created)}</span>
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
          </>
        )}

        {tab === "office" && myRank >= ROLE_RANK.admin && (
          <>
            <section className="lms-section">
              <h2 className="lms-section-h">Accounts</h2>
              <p className="lms-section-sub">
                {students ? `${students.length} account${students.length === 1 ? "" : "s"}.` : "Loading…"}{" "}
                Invites are manual while the school is in closed session. Act As opens someone
                else&apos;s classroom — a banner keeps you honest, and everything you do lands on
                their account.
              </p>
              {students && (
                <div className="lms-admin-table lms-roster">
                  {students.map((s) => (
                    <div key={s.email} className="lms-admin-row">
                      <span className="lms-admin-name">{s.name}</span>
                      <span className="lms-admin-email">{s.email}</span>
                      <span className="lms-admin-meta">
                        {formatPhone(s.phone ?? "") || "—"} · {usDate(s.dob) || "—"}
                      </span>
                      {myRank >= ROLE_RANK.global_admin &&
                      s.role !== "global_admin" &&
                      s.email !== lms.auth?.email ? (
                        <select
                          className="lms-role-select"
                          value={s.role}
                          aria-label={`Role for ${s.email}`}
                          onChange={(e) => changeRole(s.email, e.target.value as Role)}
                        >
                          <option value="student">Student</option>
                          <option value="educator">Educator</option>
                          <option value="admin">Administrator</option>
                        </select>
                      ) : (
                        <span className={ROLE_PILL[s.role] ?? ROLE_PILL.student}>
                          {ROLE_LABEL[s.role] ?? s.role}
                        </span>
                      )}
                      {myRank > rankOf(s.role) && s.email !== lms.auth?.email ? (
                        <button className="lms-signout" onClick={() => actAs(s.email)}>
                          Act As
                        </button>
                      ) : (
                        <span />
                      )}
                    </div>
                  ))}
                </div>
              )}
              <form className="lms-admin-form" onSubmit={createAccount}>
                <div className="lms-form-row">
                  <input
                    className="lms-cert-name"
                    placeholder="First name"
                    required
                    maxLength={40}
                    value={nFirst}
                    onChange={(e) => setNFirst(e.target.value)}
                  />
                  <input
                    className="lms-cert-name"
                    placeholder="Last name"
                    required
                    maxLength={40}
                    value={nLast}
                    onChange={(e) => setNLast(e.target.value)}
                  />
                </div>
                <input
                  className="lms-cert-name"
                  type="email"
                  placeholder="email@example.com"
                  required
                  value={nEmail}
                  onChange={(e) => setNEmail(e.target.value)}
                />
                <div className="lms-form-row">
                  <input
                    className="lms-cert-name"
                    type="tel"
                    placeholder="Telephone (optional)"
                    maxLength={24}
                    value={nPhone}
                    onChange={(e) => setNPhone(formatPhoneInput(e.target.value))}
                  />
                  <input
                    className="lms-cert-name"
                    type="date"
                    aria-label="Birthday (optional — they can add it)"
                    min="1900-01-01"
                    value={nDob}
                    onChange={(e) => setNDob(e.target.value)}
                  />
                </div>
                <div className="lms-form-row">
                  <input
                    className="lms-cert-name"
                    type="text"
                    placeholder="Password (10+ characters)"
                    required
                    minLength={10}
                    value={nPass}
                    onChange={(e) => setNPass(e.target.value)}
                  />
                  <select
                    className="lms-cert-name lms-role-select--form"
                    value={nRole}
                    aria-label="Role for the new account"
                    onChange={(e) => setNRole(e.target.value as Role)}
                  >
                    <option value="student">Student</option>
                    <option value="educator">Educator</option>
                    {myRank >= ROLE_RANK.global_admin && (
                      <option value="admin">Administrator</option>
                    )}
                  </select>
                </div>
                <button className="btn btn--solid lms-login-btn" type="submit">
                  Create Account
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
                  <div className="lms-admin-table lms-subs">
                    {subs.map((s) => (
                      <div key={s.email} className="lms-admin-row">
                        <span className="lms-admin-email">{s.email}</span>
                        <span className="lms-admin-meta">{s.source}</span>
                        <span className="lms-admin-meta">{usDate(s.created)}</span>
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
                        {(q.rating ?? 0) > 0 && <>{"★".repeat(q.rating!)} · </>}
                        {q.name} ({q.email}) · {q.context} · {usDate(q.created)}
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
          </>
        )}

        {tab === "ops" && myRank >= ROLE_RANK.global_admin && (
          <section className="lms-section">
            <h2 className="lms-section-h">School ops</h2>
            <p className="lms-section-sub">
              Backups zip every data store into <code>sms-lms-backups/</code> next to the data
              folder — newest 14 kept. For a nightly run, add a cron job in Hostinger&apos;s hPanel
              (Advanced → Cron Jobs) with the command below. For uptime, point a free monitor
              (e.g. UptimeRobot) at <code>/api/health.php</code>. Role changes live on the
              Front Office roster — the dropdowns there are yours alone.
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

            <h2 className="lms-section-h">Nudge desk</h2>
            <p className="lms-section-sub">
              One email max per student per run: a dying streak first, then a waiting Final, an
              almost-finished course, or a quiet week — cooldowns keep it polite, and students can
              switch them off in their Student File. Add this as a second daily cron job
              (run it in the evening, when a streak can still be saved).
            </p>
            {nudgeCron && (
              <div className="lms-ops-cron">
                <code>curl -s &quot;{nudgeCron}&quot; &gt; /dev/null</code>
                <button
                  className="lms-signout"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(`curl -s "${nudgeCron}" > /dev/null`)
                      .then(() => flash("Nudge cron command copied."));
                  }}
                >
                  Copy
                </button>
              </div>
            )}
            <div className="lms-pcard-actions">
              <button
                className="btn btn--outline lms-login-btn"
                onClick={async () => {
                  const r = await apiNudgeRun(token, true);
                  if (r.ok) {
                    const list = (r.data.nudges as { email: string; type: string }[]) ?? [];
                    flash(
                      list.length === 0
                        ? "Dry run: nobody needs a nudge right now."
                        : `Dry run: would email ${list.length} — ${list
                            .map((n) => `${n.email} (${n.type})`)
                            .join(", ")
                            .slice(0, 200)}`
                    );
                  } else {
                    flash((r.data.error as string) ?? "Dry run failed.");
                  }
                }}
              >
                Dry Run
              </button>
              <button
                className="btn btn--outline lms-login-btn"
                onClick={async () => {
                  const r = await apiNudgeRun(token, false);
                  if (r.ok) {
                    flash(`Nudges sent: ${r.data.sent as number} (${r.data.optedOut as number} opted out).`);
                  } else {
                    flash((r.data.error as string) ?? "Nudge run failed.");
                  }
                }}
              >
                Send Nudges Now
              </button>
            </div>
          </section>
        )}

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
