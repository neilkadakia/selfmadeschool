"use client";

// One composer, one audience, and the record of who it reached.
//
// The audience count is live, so the number beside "Everyone" is the number
// of people who will actually get this, not an estimate from last week.

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Room, Panel, Empty, Skeleton, useFacultyData, useFlash } from "@/components/faculty/ui";
import { usDate } from "@/lib/format";
import {
  audiencesList,
  broadcastsList,
  broadcastSend,
  type Audiences,
  type Broadcast,
} from "@/lib/ask";

type Data = { broadcasts: Broadcast[] };

export default function BroadcastDesk() {
  const { data, error, reload, token } = useFacultyData<Data>(broadcastsList);
  const { flash, node } = useFlash();

  const [aud, setAud] = useState<Audiences | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState("all:");
  const [alsoEmail, setAlsoEmail] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadAudiences = useCallback(() => {
    if (!token) return;
    void audiencesList(token).then((r) => {
      if (r.ok) setAud(r.data as unknown as Audiences);
    });
  }, [token]);

  useEffect(() => {
    loadAudiences();
  }, [loadAudiences]);

  const [kind, value] = target.split(":");
  const reach =
    kind === "all"
      ? (aud?.everyone ?? 0)
      : kind === "homeroom"
        ? (aud?.homerooms.find((h) => h.id === value)?.count ?? 0)
        : (aud?.courses.find((c) => c.slug === value)?.count ?? 0);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const r = await broadcastSend(token, {
      subject: subject.trim(),
      body: body.trim(),
      audience: kind,
      value,
      email: alsoEmail,
    });
    setBusy(false);
    if (r.ok) {
      setSubject("");
      setBody("");
      const mailed = r.data.mailed as number;
      const out = r.data.optedOut as number;
      flash(
        `Sent to ${r.data.reached}. ${mailed} emailed${out > 0 ? `, ${out} had email switched off` : ""}.`
      );
      reload();
      loadAudiences();
    } else {
      flash((r.data.error as string) ?? "Could not send that.");
    }
  };

  const rows = data?.broadcasts ?? [];

  return (
    <Room
      kicker="Faculty Lounge"
      title="Broadcast"
      sub="Say one thing to a chosen group. The bell always rings; email is a separate tick and respects the switch students already have in their Student File. Every send keeps a record of who it reached."
    >
      {node}
      {error && <Empty title="Could not load that.">{error}</Empty>}
      {!data && !error && <Skeleton rows={3} />}

      {data && (
        <Panel title="Compose" sub={`${reach} ${reach === 1 ? "student" : "students"} will get this.`}>
          <form className="fac-ch-form" onSubmit={send}>
            <label className="fac-field">
              <span>Subject</span>
              <input
                className="lms-input"
                maxLength={120}
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Office Hours moved to Thursday"
              />
            </label>
            <label className="fac-field">
              <span>What you want to say</span>
              <textarea
                className="lms-notes"
                rows={5}
                maxLength={2000}
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Plain English. They will read this on a phone."
              />
            </label>
            <label className="fac-field">
              <span>Who gets it</span>
              <select className="lms-input" value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="all:">Everyone · {aud?.everyone ?? 0}</option>
                {aud?.homeroomsOn &&
                  aud.homerooms.map((h) => (
                    <option key={h.id} value={`homeroom:${h.id}`}>
                      {h.name} · {h.count}
                    </option>
                  ))}
                {aud?.courses.map((c) => (
                  <option key={c.slug} value={`course:${c.slug}`}>
                    Anyone in {c.title} · {c.count}
                  </option>
                ))}
              </select>
            </label>
            <label className="reg-optout">
              <input
                type="checkbox"
                checked={alsoEmail}
                onChange={(e) => setAlsoEmail(e.target.checked)}
              />
              <span>
                Email it as well. Students who switched school email off in their Student File are
                skipped, and the record below says how many that was.
              </span>
            </label>
            <button className="btn btn--outline" type="submit" disabled={busy || reach === 0}>
              {busy ? "Sending…" : `Send to ${reach}`}
            </button>
          </form>
        </Panel>
      )}

      {data && rows.length === 0 && (
        <Empty title="Nothing sent yet.">
          {" "}
          The Bulletin is the noticeboard; this is for the things people need to be told.
        </Empty>
      )}

      {rows.map((b) => (
        <Panel
          key={b.id}
          title={b.subject}
          sub={`${b.audienceName} · ${b.reached} reached${
            b.emailed ? ` · ${b.mailed} emailed` : ""
          }${b.optedOut > 0 ? ` · ${b.optedOut} opted out` : ""} · ${usDate(b.sent)} by ${b.by}`}
        >
          <p className="fac-quad-text">{b.body}</p>
        </Panel>
      ))}
    </Room>
  );
}
