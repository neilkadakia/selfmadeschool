"use client";

// "Take this course with you."
//
// Hands the service worker every unit URL in a course and watches it pull
// them in. The worker does the fetching so the pages land in the same cache
// that serves them later, and so closing the tab does not abandon the job.

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { courseUnits, type Course } from "@/lib/lms";

type Phase = "idle" | "working" | "done";

// Whether this browser can do it at all. A capability never changes, so it is
// read as an external store with nothing to subscribe to, rather than copied
// into state from inside an effect.
const noSubscribe = () => () => {};
const hasServiceWorker = () => "serviceWorker" in navigator;
const noneOnServer = () => false;

export default function SaveOffline({ course }: { course: Course }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState(0);

  const supported = useSyncExternalStore(noSubscribe, hasServiceWorker, noneOnServer);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (e: MessageEvent) => {
      const d = e.data || {};
      if (d.type === "cache-progress") {
        setDone(d.done);
        setTotal(d.total);
        setFailed(d.failed);
      }
      if (d.type === "cache-done") {
        setDone(d.done);
        setTotal(d.total);
        setFailed(d.failed);
        setPhase("done");
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);

  const save = useCallback(async () => {
    const reg = await navigator.serviceWorker.ready;
    const worker = reg.active;
    if (!worker) return;
    // Only the units that have a lesson written: asking for a page that is
    // not built yet would just count failures.
    const urls = courseUnits(course)
      .filter((u) => course.lessons[u.slug])
      .map((u) => `/learn/${course.slug}/${u.slug}/`);
    urls.push(`/learn/${course.slug}/`);
    setPhase("working");
    setDone(0);
    setTotal(urls.length);
    setFailed(0);
    worker.postMessage({ type: "cache-urls", urls });
  }, [course]);

  if (!supported) return null;

  return (
    <div className="lms-save-offline">
      {phase === "working" ? (
        <>
          <span className="lms-save-bar" aria-hidden="true">
            <span style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }} />
          </span>
          <span className="lms-save-text">
            Saving {done} of {total}…
          </span>
        </>
      ) : phase === "done" ? (
        <span className="lms-save-text is-done">
          Saved for offline
          {failed > 0 ? ` · ${failed} could not be reached` : ""}. Read it with no signal.
        </span>
      ) : (
        <button className="lms-save-btn" onClick={() => void save()}>
          Take This Course Offline
        </button>
      )}
    </div>
  );
}
