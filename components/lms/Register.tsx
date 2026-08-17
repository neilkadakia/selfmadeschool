"use client";

// The Register: who else is in this school.
//
// Names, portraits, levels and kudos. No email addresses ever reach a
// student, and there is no private mail here by design: everything students
// say to each other happens in a room the whole school can see.
//
// Being listed is a choice. The toggle at the bottom takes you out of the
// register without touching anything else about your account.

import { useCallback, useEffect, useState } from "react";
import { isFaculty } from "@/lib/api";
import { levelFor } from "@/lib/lms";
import { usDate } from "@/lib/format";
import { useLms } from "@/components/useLms";
import Portrait from "@/components/lms/Portrait";
import { registerList, giveKudos, setListed, type Person, type KudosNote } from "@/lib/quad";

export default function Register() {
  const lms = useLms();
  const token = lms.auth?.token ?? "";
  const faculty = isFaculty(lms.auth?.role);

  const [people, setPeople] = useState<Person[] | null>(null);
  const [kudos, setKudos] = useState<KudosNote[]>([]);
  const [listed, setListedState] = useState(true);
  const [offline, setOffline] = useState(false);
  const [giving, setGiving] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (!token) return;
    void registerList(token).then((r) => {
      if (r.status === 0) {
        setOffline(true);
        return;
      }
      setOffline(false);
      if (r.ok) {
        setPeople((r.data.people as Person[]) ?? []);
        setKudos((r.data.kudos as KudosNote[]) ?? []);
        setListedState(Boolean(r.data.listed));
      }
    });
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (!token) return null;

  const send = async (handle: string) => {
    setError("");
    const r = await giveKudos(token, handle, note.trim());
    if (r.ok) {
      setGiving("");
      setNote("");
      load();
    } else {
      setError((r.data.error as string) ?? "Could not send that.");
    }
  };

  const toggleListed = async () => {
    const next = !listed;
    setListedState(next);
    await setListed(token, next);
    void load();
  };

  const students = people?.filter((p) => p.role === "student") ?? [];
  const staff = people?.filter((p) => p.role !== "student") ?? [];

  return (
    <div className="learn register">
      <div className="learn-wrap">
        <header className="learn-head">
          <p className="kicker kicker--acc">The Register</p>
          <h1 className="learn-h1">Everyone else doing this.</h1>
          <p className="learn-sub">
            You are not the only person working through this, and the proof is below. Hand somebody
            kudos when they help you. Five a day, one per person ever, so they mean something when
            they land.
          </p>
        </header>

        {offline && (
          <p className="lms-muted">The Register needs a connection. It&apos;ll be here when you&apos;re back.</p>
        )}

        {!people && !offline && <SkeletonGrid />}

        {kudos.length > 0 && (
          <section className="reg-section" aria-label="Kudos you have been given">
            <h2 className="reg-h2">Handed to you</h2>
            <div className="reg-kudos">
              {kudos.map((k, i) => (
                <div key={`${k.at}-${i}`} className="reg-kudo">
                  <span className="reg-kudo-from">{k.from}</span>
                  {k.note && <p className="reg-kudo-note">{k.note}</p>}
                  <span className="reg-kudo-date">{usDate(k.at)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {error && (
          <p className="lms-login-error" role="alert">
            {error}
          </p>
        )}

        {students.length > 0 && (
          <section className="reg-section" aria-label="Students">
            <h2 className="reg-h2">
              The roll <span className="reg-h2-count">{students.length}</span>
            </h2>
            <div className="reg-grid">
              {students.map((p) => (
                <PersonCard
                  key={p.handle}
                  p={p}
                  faculty={faculty}
                  giving={giving}
                  note={note}
                  setGiving={setGiving}
                  setNote={setNote}
                  send={send}
                />
              ))}
            </div>
          </section>
        )}

        {staff.length > 0 && (
          <section className="reg-section" aria-label="Faculty">
            <h2 className="reg-h2">Faculty</h2>
            <div className="reg-grid">
              {staff.map((p) => (
                <PersonCard
                  key={p.handle}
                  p={p}
                  faculty={faculty}
                  giving={giving}
                  note={note}
                  setGiving={setGiving}
                  setNote={setNote}
                  send={send}
                />
              ))}
            </div>
          </section>
        )}

        <section className="reg-section" aria-label="Your listing">
          <h2 className="reg-h2">Your listing</h2>
          <label className="reg-optout">
            <input type="checkbox" checked={listed} onChange={() => void toggleListed()} />
            <span>
              Show me in the Register. Turn this off and the rest of the school stops seeing your
              name, level and clubs. Everything else about your account stays exactly as it is.
            </span>
          </label>
        </section>
      </div>
    </div>
  );
}

function PersonCard({
  p,
  faculty,
  giving,
  note,
  setGiving,
  setNote,
  send,
}: {
  p: Person;
  faculty: boolean;
  giving: string;
  note: string;
  setGiving: (h: string) => void;
  setNote: (s: string) => void;
  send: (handle: string) => Promise<void>;
}) {
  // Faculty are not on the ladder: a teacher wearing a Freshman badge reads
  // as a bug, not a fact.
  const student = p.role === "student";
  const open = giving === p.handle;

  return (
    <article className={`reg-card${p.you ? " is-you" : ""}`}>
      <div className="reg-face">
        {p.avatar ? (
          <Portrait avatar={p.avatar} equipped={p.equipped ?? {}} size={56} />
        ) : (
          <span className="reg-initial" aria-hidden="true">
            {p.name.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>

      <div className="reg-body">
        <p className="reg-name">
          {p.name}
          {p.you && <span className="reg-tag">You</span>}
          {!student && <span className="reg-tag is-staff">Faculty</span>}
        </p>
        {student ? (
          <p className="reg-level">
            {levelFor(p.xp).name} · {p.xp.toLocaleString()} XP
          </p>
        ) : (
          <p className="reg-level">Teaches here</p>
        )}

        {student && (
          <div className="reg-stats">
            <span>
              <strong>{p.units}</strong> {p.units === 1 ? "unit" : "units"}
            </span>
            {p.streak > 0 && (
              <span>
                <strong>{p.streak}</strong> day streak
              </span>
            )}
            {p.kudos > 0 && (
              <span>
                <strong>{p.kudos}</strong> kudos
              </span>
            )}
          </div>
        )}

        {p.clubs.length > 0 && (
          <ul className="reg-clubs">
            {p.clubs.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        )}
        {faculty && p.email && <p className="reg-email">{p.email}</p>}
      </div>

      {!p.you && (
        <div className="reg-give">
          {open ? (
            <>
              <input
                className="lms-input"
                maxLength={140}
                autoFocus
                placeholder="What did they do? (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void send(p.handle);
                  if (e.key === "Escape") setGiving("");
                }}
              />
              <button className="reg-send" onClick={() => void send(p.handle)}>
                Send
              </button>
              <button className="reg-cancel" onClick={() => setGiving("")}>
                Cancel
              </button>
            </>
          ) : (
            <button className="reg-kudos-btn" onClick={() => setGiving(p.handle)}>
              Give Kudos
            </button>
          )}
        </div>
      )}
    </article>
  );
}

// A shape that matches what is coming, rather than a spinner that does not.
function SkeletonGrid() {
  return (
    <div className="reg-grid" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="reg-card reg-card--skel">
          <span className="reg-skel-face" />
          <span className="reg-skel-lines">
            <span style={{ width: "58%" }} />
            <span style={{ width: "40%" }} />
            <span style={{ width: "74%" }} />
          </span>
        </div>
      ))}
    </div>
  );
}
