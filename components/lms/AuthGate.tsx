"use client";

// The learning section is invite-only while we're pre-launch. Signed
// out → sign-in card with a forgot-password flow (emailed code); signed
// in → the actual content. Progress syncs to the account.

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useLms } from "@/components/useLms";
import { apiRequestReset, apiResetPassword } from "@/lib/api";
import Wordmark from "@/components/Wordmark";

type Mode = "signin" | "forgot" | "reset";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const lms = useLms();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  if (!lms.loaded) {
    return <div className="learn" aria-busy="true" />;
  }

  if (lms.auth) return <>{children}</>;

  const switchMode = (next: Mode, keepNotice = false) => {
    setMode(next);
    setError("");
    if (!keepNotice) setNotice("");
    setBusy(false);
  };

  const submitSignin = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await lms.login(email.trim(), password);
    setBusy(false);
    if (!res.ok) setError(res.error ?? "Sign-in failed.");
  };

  const submitForgot = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    await apiRequestReset(email.trim());
    setBusy(false);
    setNotice("If that address has an account, a six-digit code is on its way. It expires in 15 minutes.");
    switchMode("reset", true);
  };

  const submitReset = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await apiResetPassword(email.trim(), code.trim(), password);
    setBusy(false);
    if (res.ok) {
      setPassword("");
      setCode("");
      setNotice("Password changed. Sign in with the new one.");
      switchMode("signin", true);
    } else {
      setError((res.data.error as string) ?? "Could not reset the password.");
    }
  };

  return (
    <div className="learn">
      <div className="learn-wrap lms-gate">
        <Link href="/" className="lms-gate-brand">
          <Wordmark gid="dawn-gate" />
        </Link>
        <p className="kicker kicker--acc">Students Only · Pre-Launch</p>
        <h1 className="learn-h1">Class is invite-only.</h1>
        <p className="learn-sub">
          We&apos;re pre-launch: the founding class is in session while we finish building, and
          enrollment isn&apos;t open to the public yet. Have an account? Sign in. Your progress
          follows you to any device. No account? Try the{" "}
          <Link href="/demo">demo lesson</Link> and join the{" "}
          <Link href="/#newsletter">waitlist</Link>. Those inboxes hear first when doors open.
        </p>

        {mode === "signin" && (
          <form className="lms-login" onSubmit={submitSignin}>
            {notice && (
              <p className="lms-login-notice" role="status">
                {notice}
              </p>
            )}
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
            <button
              type="button"
              className="lms-login-link"
              onClick={() => {
                setPassword("");
                switchMode("forgot");
              }}
            >
              Forgot Your Password?
            </button>
          </form>
        )}

        {mode === "forgot" && (
          <form className="lms-login" onSubmit={submitForgot}>
            <p className="lms-login-notice">
              Enter your account email and we&apos;ll send a six-digit reset code.
            </p>
            <label className="lms-login-label" htmlFor="gate-email-forgot">
              Email
            </label>
            <input
              id="gate-email-forgot"
              className="lms-cert-name lms-login-input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="btn btn--solid lms-login-btn" type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send Reset Code"}
            </button>
            <button type="button" className="lms-login-link" onClick={() => switchMode("signin")}>
              Back to Sign In
            </button>
          </form>
        )}

        {mode === "reset" && (
          <form className="lms-login" onSubmit={submitReset}>
            {notice && (
              <p className="lms-login-notice" role="status">
                {notice}
              </p>
            )}
            <label className="lms-login-label" htmlFor="gate-code">
              Reset Code
            </label>
            <input
              id="gate-code"
              className="lms-cert-name lms-login-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <label className="lms-login-label" htmlFor="gate-newpass">
              New Password
            </label>
            <input
              id="gate-newpass"
              className="lms-cert-name lms-login-input"
              type="password"
              autoComplete="new-password"
              minLength={10}
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
              {busy ? "Resetting…" : "Set New Password"}
            </button>
            <button type="button" className="lms-login-link" onClick={() => switchMode("forgot")}>
              Resend Code
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
