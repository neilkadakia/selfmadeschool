"use client";

// One honest line: appears once a student has real experience (2+ units),
// disappears after they've submitted. Quotes go to the admin for approval
// before anything reaches the homepage. No XP on purpose.
//
// Also rendered on the Final's pass screen with a course-completion context
// (the strongest moment to catch a review); stars are optional everywhere.

import { useState, type FormEvent } from "react";
import { apiFeedbackSubmit } from "@/lib/api";
import { useLms } from "@/components/useLms";

type Props = {
  totalDone: number;
  context?: string;
  prompt?: string;
};

export default function FeedbackCard({ totalDone, context, prompt }: Props) {
  const lms = useLms();
  const [text, setText] = useState("");
  const [rating, setRating] = useState(0);
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState("");

  // The thanks note outranks the feedbackAt guard: submitting sets the flag,
  // and the guard would otherwise unmount the card before it can say thanks.
  if (status === "done") {
    return (
      <section className="lms-feedback" aria-label="Feedback">
        <p className="lms-feedback-thanks">
          Noted, and thank you. If it lands on the homepage, that&apos;s your quote out there.
        </p>
      </section>
    );
  }

  if (!lms.auth || totalDone < 2 || lms.state.feedbackAt) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === "busy") return;
    setStatus("busy");
    setError("");
    const res = await apiFeedbackSubmit(
      lms.auth!.token,
      text.trim(),
      context ?? `${totalDone} units in · The 13th Grade`,
      rating
    );
    if (res.ok) {
      setStatus("done");
      lms.feedbackDone();
    } else {
      setStatus("error");
      setError((res.data.error as string) ?? "Could not send that. Try again.");
    }
  };

  return (
    <section className="lms-feedback" aria-label="Feedback">
      <h2 className="lms-section-h">One honest line</h2>
      <p className="lms-section-sub">
        {prompt ?? `${totalDone} units in. What would you tell a friend about this course?`} The
        best lines go on the homepage (with your first name, after review). Honest beats
        flattering.
      </p>
      <form className="lms-feedback-form" onSubmit={submit}>
        <div className="lms-stars" role="radiogroup" aria-label="Rating, optional">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`lms-star${rating >= n ? " is-on" : ""}`}
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              onClick={() => setRating(rating === n ? 0 : n)}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          className="lms-notes"
          rows={3}
          maxLength={300}
          required
          minLength={10}
          placeholder={"The thing I'd actually say about it…"}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {error && (
          <p className="lms-login-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn--outline lms-login-btn" type="submit" disabled={status === "busy"}>
          {status === "busy" ? "Sending…" : "Send It In"}
        </button>
      </form>
    </section>
  );
}
