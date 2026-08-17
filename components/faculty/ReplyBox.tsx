"use client";

// Writing back on a Field Work filing. Used on the Front Desk, in the
// Field Work inbox, and inside the Student File, so it lives on its own.
//
// The Enter key does not send. This is the one place in the product where
// a teacher is writing something a student will actually keep, and an
// accidental send is worse than an extra click.

import { useEffect, useRef, useState } from "react";
import { fwReply } from "@/lib/faculty";

const MAX = 1200;

export default function ReplyBox({
  token,
  email,
  unitKey,
  name,
  initial = "",
  onDone,
  onCancel,
}: {
  token: string;
  email: string;
  unitKey: string;
  name: string;
  initial?: string;
  onDone: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    box.current?.focus();
  }, []);

  const send = async () => {
    const body = text.trim();
    if (body.length < 2 || busy) return;
    setBusy(true);
    const r = await fwReply(token, email, unitKey, body);
    setBusy(false);
    if (r.ok) onDone(body);
    else setError((r.data.error as string) ?? "Could not send that.");
  };

  const first = name.split(" ")[0];

  return (
    <div className="fac-compose">
      <textarea
        ref={box}
        className="fac-textarea"
        rows={3}
        maxLength={MAX}
        placeholder={`Write back to ${first}. They get this by email and on the unit page.`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
      />
      {error && (
        <p className="fac-hint fac-warn" role="alert">
          {error}
        </p>
      )}
      <div className="fac-item-actions">
        <button
          className="fac-btn fac-btn--sm fac-btn--go"
          disabled={busy || text.trim().length < 2}
          onClick={() => void send()}
        >
          {busy ? "Sending…" : initial ? "Save the Answer" : "Send It"}
        </button>
        <button className="fac-btn fac-btn--sm fac-btn--quiet" onClick={onCancel}>
          Cancel
        </button>
        <span className="fac-hint" style={{ marginLeft: "auto" }}>
          {MAX - text.length} left
        </span>
      </div>
    </div>
  );
}
