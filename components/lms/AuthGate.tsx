"use client";

// The learning section is invite-only while we build. Signed out → login
// card; signed in → the actual content. Progress syncs to the account.

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useLms } from "@/components/useLms";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const lms = useLms();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!lms.loaded) {
    return <div className="learn" aria-busy="true" />;
  }

  if (lms.auth) return <>{children}</>;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await lms.login(email.trim(), password);
    setBusy(false);
    if (!res.ok) setError(res.error ?? "Sign-in failed.");
  };

  return (
    <div className="learn">
      <div className="learn-wrap lms-gate">
        <p className="kicker kicker--acc">Students Only</p>
        <h1 className="learn-h1">Class is invite-only.</h1>
        <p className="learn-sub">
          The learning section is in closed session while we finish building it. If you have an
          account, sign in — your progress follows you to any device. No account yet? Join the
          waitlist on the <Link href="/#newsletter">home page</Link> and you&apos;re first in line.
        </p>
        <form className="lms-login" onSubmit={submit}>
          <label className="lms-login-label" htmlFor="gate-email">
            Email
          </label>
          <input
            id="gate-email"
            className="lms-cert-name lms-login-input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className="lms-login-label" htmlFor="gate-password">
            Password
          </label>
          <input
            id="gate-password"
            className="lms-cert-name lms-login-input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p className="lms-login-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn--solid lms-login-btn" type="submit" disabled={busy}>
            {busy ? "Signing In…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
