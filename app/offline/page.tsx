import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Offline · Self Made School",
  description: "No signal. Here is what still works.",
  robots: { index: false },
};

// Shown only when the service worker has nothing cached for a page and the
// network is gone. Every link here is one the worker has almost certainly
// kept, so it is a way back rather than a dead end.
export default function Page() {
  return (
    <div className="learn">
      <div className="learn-wrap lms-gate">
        <p className="kicker kicker--coral">No signal</p>
        <h1 className="learn-h1">You are offline.</h1>
        <p className="learn-sub">
          This page was not saved to your device. Anything you have already opened still works, and
          so does anything you saved for offline from a course page. Whatever you do while you are
          out here syncs the moment you are back.
        </p>
        <div className="learn-ctas">
          <Link href="/learn/" className="btn btn--solid">
            My Desk →
          </Link>
          <Link href="/learn/review/" className="btn btn--outline">
            Study Hall
          </Link>
        </div>
      </div>
    </div>
  );
}
