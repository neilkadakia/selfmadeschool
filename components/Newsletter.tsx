"use client";

// Extra Credit — the monthly newsletter signup, styled as a paper
// enrollment slip. Doubles as the waitlist for the 14th and 15th Grades.

import { useState, type FormEvent } from "react";

type Status = "idle" | "busy" | "done" | "already" | "error";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === "busy") return;
    setStatus("busy");
    setError("");
    try {
      const res = await fetch("/api/newsletter.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "home" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setStatus(data.already ? "already" : "done");
      } else {
        setStatus("error");
        setError(data.error ?? "Something went wrong — try again.");
      }
    } catch {
      setStatus("error");
      setError("Can't reach the school server — try again in a minute.");
    }
  };

  if (status === "done" || status === "already") {
    return (
      <div className="nl-done" role="status">
        <p className="nl-slip-kicker">Enrollment Slip · Received</p>
        <p className="nl-done-big">{status === "already" ? "Already enrolled." : "You're in."}</p>
        <span className="nl-sweep" aria-hidden="true" />
        <p className="nl-done-sub">
          {status === "already"
            ? "This email is on the list — the next lesson is on its way."
            : "One lesson lands in your inbox each week. First one soon."}
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="nl-slip-kicker">Enrollment Slip</p>
      <h3 className="nl-slip-title">Get on the list.</h3>
      <span className="nl-sweep" aria-hidden="true" />
      <form className="nl-form" onSubmit={submit}>
        {/* Honeypot — humans never see or fill this. */}
        <input
          type="text"
          name="school"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="nl-trap"
          onChange={() => {}}
        />
        <div className="nl-row">
          <label className="visually-hidden" htmlFor="nl-email">
            Email address
          </label>
          <input
            id="nl-email"
            className="nl-input"
            type="email"
            required
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="btn btn--ink nl-btn" type="submit" disabled={status === "busy"}>
            {status === "busy" ? "Enrolling…" : "Count Me In"}
          </button>
        </div>
        {status === "error" && (
          <p className="nl-error" role="alert">
            {error}
          </p>
        )}
        <p className="nl-fine">One email a month · No spam · Unsubscribe anytime</p>
      </form>
    </>
  );
}
