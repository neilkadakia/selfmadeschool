"use client";

// Homeroom Bulletin: notes the teacher pins for the whole class.
// Renders nothing when nothing is pinned.

import { useEffect, useState } from "react";
import { apiBulletinList } from "@/lib/api";
import { usDate } from "@/lib/format";
import { useLms } from "@/components/useLms";

type Note = { id: string; text: string; author: string; created: string };

export default function Bulletin() {
  const lms = useLms();
  const token = lms.auth?.token ?? "";
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    void apiBulletinList(token).then((r) => {
      if (alive && r.ok && Array.isArray(r.data.notes)) {
        setNotes((r.data.notes as Note[]).slice(0, 2));
      }
    });
    return () => {
      alive = false;
    };
  }, [token]);

  if (notes.length === 0) return null;

  return (
    <div className="lms-bulletin" aria-label="Homeroom Bulletin">
      <span className="lms-bulletin-pin" aria-hidden="true">
        📌
      </span>
      <div>
        <span className="lms-bulletin-h">Homeroom Bulletin</span>
        {notes.map((n) => (
          <p key={n.id} className="lms-bulletin-text">
            {n.text}
            <span className="lms-bulletin-meta">
              {" "}
              {n.author || "Faculty"} · {usDate(n.created)}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}
