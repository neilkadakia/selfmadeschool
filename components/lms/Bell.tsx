"use client";

// The bell: what happened while you were gone.
//
// Every line in here was written by the action that caused it, so nothing
// can claim something that did not happen. Opening the panel marks the lot
// read, because a count that will not clear is worse than no count.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usDate } from "@/lib/format";
import { useLms } from "@/components/useLms";
import { notifyList, notifyAct, type Note } from "@/lib/notify";

export default function Bell() {
  const lms = useLms();
  const token = lms.auth?.token ?? "";
  const [notes, setNotes] = useState<Note[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    if (!token) return;
    void notifyList(token).then((r) => {
      if (r.ok) {
        setNotes((r.data.notes as Note[]) ?? []);
        setUnread((r.data.unread as number) ?? 0);
      }
    });
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // Clicking anywhere else closes it, and so does Escape.
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  if (!token) return null;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0);
      setNotes((n) => n.map((x) => ({ ...x, read: true })));
      void notifyAct(token, "read-all");
    }
  };

  return (
    <div className="bell" ref={wrap}>
      <button
        className={`bell-btn${unread > 0 ? " has-unread" : ""}`}
        aria-expanded={open}
        aria-label={unread > 0 ? `${unread} unread` : "Nothing new"}
        onClick={toggle}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && <span className="bell-count">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="bell-panel" role="dialog" aria-label="What happened">
          <div className="bell-head">
            <span>Lately</span>
            {notes.length > 0 && (
              <button
                className="bell-clear"
                onClick={() => {
                  setNotes([]);
                  setUnread(0);
                  void notifyAct(token, "clear");
                }}
              >
                Clear
              </button>
            )}
          </div>
          {notes.length === 0 ? (
            <p className="bell-empty">Nothing new. Go and make something happen.</p>
          ) : (
            notes.map((n) =>
              n.href ? (
                <Link key={n.id} href={n.href} className="bell-note" onClick={() => setOpen(false)}>
                  <span className="bell-note-text">{n.text}</span>
                  <span className="bell-note-date">{usDate(n.at)}</span>
                </Link>
              ) : (
                <span key={n.id} className="bell-note">
                  <span className="bell-note-text">{n.text}</span>
                  <span className="bell-note-date">{usDate(n.at)}</span>
                </span>
              )
            )
          )}
        </div>
      )}
    </div>
  );
}
