"use client";

// Checking a certificate, without an account.
//
// Anyone can land here: an employer, a parent, somebody who was handed a PDF.
// The answer is deliberately small. A name, a course, a date, and whether the
// final was passed. Nothing about who else the school teaches.

import { useCallback, useState, type FormEvent } from "react";
import Link from "next/link";
import { usDate } from "@/lib/format";
import { apiCall } from "@/lib/api";

type Result =
  | { ok: true; name: string; course: string; passedFinal: boolean; score: number | null; total: number | null; date: string }
  | { ok: false; reason?: string; error?: string };

export default function Verify() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);

  const check = useCallback(async (raw: string) => {
    const clean = raw.trim().toUpperCase().replace(/[^A-F0-9]/g, "");
    if (clean.length !== 12) {
      setResult({ ok: false, error: "A certificate code is twelve characters." });
      return;
    }
    setBusy(true);
    setOffline(false);
    const r = await apiCall(`verify.php?code=${encodeURIComponent(clean)}`);
    setBusy(false);
    if (r.status === 0) {
      setOffline(true);
      return;
    }
    setResult(r.data as Result);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void check(code);
  };

  return (
    <div className="verify">
      <div className="container">
        <p className="kicker kicker--acc">The Registrar</p>
        <h1 className="h1 verify-h1">Check a certificate.</h1>
        <p className="verify-lede">
          Every certificate this school issues carries a code. Type it here and the school will
          confirm the name on it, the course, and whether the final was passed. That is all this
          page will ever tell you about anybody.
        </p>

        <form className="verify-form" onSubmit={submit}>
          <input
            className="verify-input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="A1B2C3D4E5F6"
            maxLength={16}
            aria-label="Certificate code"
            autoComplete="off"
            spellCheck={false}
          />
          <button className="btn btn--solid" type="submit" disabled={busy}>
            {busy ? "Checking…" : "Check It"}
          </button>
        </form>

        {offline && <p className="verify-note">Could not reach the school. Try again in a moment.</p>}

        {result && result.ok && (
          <div className="verify-card is-real">
            <p className="verify-verdict">This certificate is real.</p>
            <dl className="verify-facts">
              <div>
                <dt>Name</dt>
                <dd>{result.name}</dd>
              </div>
              <div>
                <dt>Course</dt>
                <dd>{result.course}</dd>
              </div>
              <div>
                <dt>Final</dt>
                <dd>
                  {result.passedFinal
                    ? `Passed${result.score !== null ? ` · ${result.score}/${result.total}` : ""}`
                    : "Course completed; final not taken"}
                </dd>
              </div>
              {result.date && (
                <div>
                  <dt>Dated</dt>
                  <dd>{usDate(result.date)}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {result && !result.ok && (
          <div className="verify-card">
            <p className="verify-verdict">
              {result.reason === "not-earned"
                ? "That code belongs to a course nobody has finished yet."
                : result.error ?? "No certificate matches that code."}
            </p>
            <p className="verify-note">
              Codes are twelve characters, letters A to F and digits. Check for a typo before
              assuming the worst; if it still does not match, the school has no record of it.
            </p>
          </div>
        )}

        <p className="verify-back">
          <Link href="/">← Self Made School</Link>
        </p>
      </div>
    </div>
  );
}
