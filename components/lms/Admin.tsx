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
} from "@/lib/api";
import { useLms } from "@/components/useLms";

type Student = { email: string; name: string; role: string };
type Subscriber = { email: string; created: string; source: string };

export default function Admin() {
  const lms = useLms();
  const token = lms.auth?.token ?? "";
  const isAdmin = lms.auth?.role === "admin";

  const [students, setStudents] = useState<Student[] | null>(null);
  const [subs, setSubs] = useState<Subscriber[] | null>(null);
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
