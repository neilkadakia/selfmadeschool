import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy — Self Made School",
  description: "What Self Made School collects (very little) and what we do with it (very little).",
};

export default function Page() {
  return (
    <section className="legal">
      <p className="kicker kicker--acc">The Fine Print</p>
      <h1 className="legal-h1">No pop quizzes. No cookies, either.</h1>
      <p>
        This site is a static page. It doesn&apos;t set tracking cookies, run third-party analytics,
        or build a profile of you while you read about budgeting.
      </p>
      <p>
        When enrollment opens, signing up will ask for an email address — and that&apos;s the whole
        form. We&apos;ll use it to send you lessons and class updates, never to sell to anyone, and
        every email will have a working unsubscribe link.
      </p>
      <p>
        If any of this changes, this page changes first — in plain English, like everything else
        here.
      </p>
    </section>
  );
}
