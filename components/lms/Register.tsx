"use client";

// The Register: who else is in this school.
//
// Names, levels and kudos. No email addresses ever reach a student, and
// there is no private mail here by design: everything students say to each
// other happens in a room the whole school can see.
//
// Being listed is a choice. The toggle at the bottom takes you out of the
// register without touching anything else about your account.

import { useCallback, useEffect, useState } from "react";
import { isFaculty } from "@/lib/api";
import { levelFor } from "@/lib/lms";
import { usDate } from "@/lib/format";
import { useLms } from "@/components/useLms";
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

  return (
    <div className="register">
      <header className="learn-head">
        <p className="kicker kicker--acc">The Register</p>
        <h1 className="learn-h1">Everyone else doing this.</h1>
        <p className="learn-sub">
          You are not the only person working through this, and the proof is below. Hand somebody
          kudos when they help you. You get five a day, one per person, ever, so they mean
          something when they land.
        </p>
      </header>

      {offline && <p className="lms-muted">The Register needs a connection. It&apos;ll be here when you&apos;re back.</p>}

      {kudos.length > 0 && (
        <section className="lms-section" aria-label="Kudos you have been given">
          <h2 className="lms-section-h">Handed to you</h2>
          <div className="reg-kudos">
            {kudos.map((k, i) => (
              <div key={`${k.at}-${i}`} className="reg-kudo">
                <span className="reg-kudo-from">{k.from}</span>
                {k.note && <p className="reg-kudo-note">“{k.note}”</p>}
                <span className="reg-kudo-date">{usDate(k.at)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="lms-section" aria-label="The roll">
        <h2 className="lms-section-h">The roll</h2>
        {error && (
          <p className="lms-login-error" role="alert">
            {error}
          </p>
        )}
        <div className="reg-grid">
          {people?.map((p) => {
            // Faculty are not on the ladder: a teacher with a Freshman badge
            // reads as a bug, not a fact.
            const student = p.role === "student";
            return (
              <article key={p.handle} className={`reg-card${p.you ? " is-you" : ""}`}>
                <div className="reg-card-top">
                  <span className="reg-name">
                    {p.name}
                    {p.you && <span className="reg-tag">You</span>}
                    {!student && <span className="reg-tag is-staff">Faculty</span>}
                  </span>
                  {student && <span className="reg-level">{levelFor(p.xp).name}</span>}
                </div>
                <div className="reg-stats">
                  {student && (
                    <>
                      <span>
                        <strong>{p.xp.toLocaleString()}</strong> XP
                      </span>
                      <span>
                        <strong>{p.units}</strong> {p.units === 1 ? "unit" : "units"}
                      </span>
                    </>
                  )}
                  {p.streak > 0 && student && (
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
                {p.clubs.length > 0 && <p className="reg-clubs">{p.clubs.join(" · ")}</p>}
                {faculty && p.email && <p className="reg-email">{p.email}</p>}
                {!p.you && (
                  <div className="reg-give">
                    {giving === p.handle ? (
                      <>
                        <input
                          className="lms-input"
                          maxLength={140}
                          autoFocus
                          placeholder="What did they do? (optional)"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                        />
                        <button className="btn btn--outline" onClick={() => void send(p.handle)}>
                          Send
                        </button>
                        <button className="quad-post-act" onClick={() => setGiving("")}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button className="quad-post-act" onClick={() => setGiving(p.handle)}>
                        Give Kudos
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="lms-section" aria-label="Your listing">
        <h2 className="lms-section-h">Your listing</h2>
        <label className="reg-optout">
          <input type="checkbox" checked={listed} onChange={() => void toggleListed()} />
          <span>
            Show me in the Register. Turn this off and the rest of the school stops seeing your
            name, level and clubs. Everything else about your account stays exactly as it is.
          </span>
        </label>
      </section>
    </div>
  );
}
