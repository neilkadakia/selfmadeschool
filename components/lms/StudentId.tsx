"use client";

// The Student ID: the school asks every student for a real contact
// record — first name, last name, phone — before class starts.
// Email is the sign-in and stays fixed. Nothing here is ever public.

import { useState, type FormEvent } from "react";
import { apiUpdateProfile, type AuthUser } from "@/lib/api";
import { useLms } from "@/components/useLms";

export default function StudentId() {
  const lms = useLms();
  const auth = lms.auth;
  // Long-time students already gave us a display name — split it so the
  // card arrives mostly filled and takes one tap to file.
  const guessed = (auth?.name ?? "").trim().split(/\s+/).filter(Boolean);
  const [first, setFirst] = useState(auth?.first || guessed[0] || "");
  const [last, setLast] = useState(auth?.last || guessed.slice(1).join(" ") || "");
  const [phone, setPhone] = useState(auth?.phone ?? "");
  const [dob, setDob] = useState(auth?.dob ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!auth) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await apiUpdateProfile(auth.token, {
      first: first.trim(),
      last: last.trim(),
      phone: phone.trim(),
      dob,
    });
    setBusy(false);
    if (res.ok) {
      lms.adoptAuthUser(res.data.user as Partial<Omit<AuthUser, "token">>);
    } else {
      setError((res.data.error as string) ?? "Could not save the card — try again.");
    }
  };

  return (
    <form className="lms-login" onSubmit={submit}>
      <div className="lms-form-row">
        <div>
          <label className="lms-login-label" htmlFor="enroll-first">
            First Name
          </label>
          <input
            id="enroll-first"
            className="lms-cert-name lms-login-input"
            autoComplete="given-name"
            required
            maxLength={40}
            value={first}
            onChange={(e) => setFirst(e.target.value)}
          />
        </div>
        <div>
          <label className="lms-login-label" htmlFor="enroll-last">
            Last Name
          </label>
          <input
            id="enroll-last"
            className="lms-cert-name lms-login-input"
            autoComplete="family-name"
            required
            maxLength={40}
            value={last}
            onChange={(e) => setLast(e.target.value)}
          />
        </div>
      </div>
      <label className="lms-login-label" htmlFor="enroll-email">
        Email — Your Sign-In
      </label>
      <input
        id="enroll-email"
        className="lms-cert-name lms-login-input"
        value={auth.email}
        disabled
        aria-label="Email (fixed)"
      />
      <div className="lms-form-row">
        <div>
          <label className="lms-login-label" htmlFor="enroll-phone">
            Telephone
          </label>
          <input
            id="enroll-phone"
            className="lms-cert-name lms-login-input"
            type="tel"
            autoComplete="tel"
            required
            maxLength={24}
            placeholder="+1 555 010 2030"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <label className="lms-login-label" htmlFor="enroll-dob">
            Birthday
          </label>
          <input
            id="enroll-dob"
            className="lms-cert-name lms-login-input"
            type="date"
            autoComplete="bday"
            required
            min="1900-01-01"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
        </div>
      </div>
      {error && (
        <p className="lms-login-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn--solid lms-login-btn" type="submit" disabled={busy}>
        {busy ? "Printing…" : "Issue My Student ID"}
      </button>
      <p className="lms-enroll-note">
        Only the front office sees this — it never appears on the Honor Roll, your
        certificate shows your full name, and you can update it anytime in your Student File.
      </p>
    </form>
  );
}
