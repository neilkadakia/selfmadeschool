"use client";

// The Bulletin and the Office Hours calendar: the two ways the school
// talks to everybody at once. They live together because they answer the
// same question, which is "what do I want the class to know this week".

import { useEffect, useState, type FormEvent } from "react";
import { usDate } from "@/lib/format";
import {
  apiBulletinDelete,
  apiBulletinList,
  apiSessionAct,
  apiSessionCreate,
  apiSessions,
  type Session,
} from "@/lib/api";
import { bulletinPin, bulletinPost, roomList, type Homeroom } from "@/lib/faculty";
import { Empty, Panel, Room, Skeleton, Tag, useFacultyData, useFlash } from "./ui";

type Note = {
  id: string;
  text: string;
  author: string;
  created: string;
  pinned: boolean;
  homeroom: string;
  homeroomName: string;
  until: string;
  expired: boolean;
};

export default function BulletinDesk() {
  const { data, error, reload, token } = useFacultyData<{ notes: Note[] }>(apiBulletinList);
  const { flash, node: flashNode } = useFlash();

  const [text, setText] = useState("");
  const [pinned, setPinned] = useState(false);
  const [homeroom, setHomeroom] = useState("");
  const [until, setUntil] = useState("");
  const [rooms, setRooms] = useState<Homeroom[]>([]);
  const [roomsOn, setRoomsOn] = useState(false);

  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [sTitle, setSTitle] = useState("");
  const [sWhen, setSWhen] = useState("");
  const [sDuration, setSDuration] = useState("60");
  const [sCapacity, setSCapacity] = useState("12");
  const [sLink, setSLink] = useState("");
  const [sBlurb, setSBlurb] = useState("");

  useEffect(() => {
    if (!token) return;
    void apiSessions(token).then((r) => {
      if (r.ok) setSessions(r.data.sessions as Session[]);
    });
    void roomList(token).then((r) => {
      if (r.ok) {
        setRooms(r.data.homerooms as Homeroom[]);
        setRoomsOn(Boolean(r.data.enabled));
      }
    });
  }, [token]);

  const post = async (e: FormEvent) => {
    e.preventDefault();
    const r = await bulletinPost(token, {
      text: text.trim(),
      pinned,
      ...(homeroom ? { homeroom } : {}),
      ...(until ? { until } : {}),
    });
    if (r.ok) {
      setText("");
      setPinned(false);
      setUntil("");
      reload();
      flash(homeroom ? "Pinned for that homeroom." : "Pinned. The whole class sees it.");
    } else {
      flash((r.data.error as string) ?? "Could not pin that.");
    }
  };

  const createSession = async (e: FormEvent) => {
    e.preventDefault();
    if (!sWhen) return;
    const r = await apiSessionCreate(token, {
      title: sTitle.trim(),
      blurb: sBlurb.trim(),
      startsAt: new Date(sWhen).toISOString(),
      durationMin: parseInt(sDuration, 10) || 60,
      capacity: parseInt(sCapacity, 10) || 12,
      link: sLink.trim(),
    });
    if (r.ok) {
      setSTitle("");
      setSWhen("");
      setSLink("");
      setSBlurb("");
      const list = await apiSessions(token);
      if (list.ok) setSessions(list.data.sessions as Session[]);
      flash("On the calendar. Students see it on their desk now.");
    } else {
      flash((r.data.error as string) ?? "Could not schedule that.");
    }
  };

  return (
    <Room
      kicker="Faculty Lounge"
      title="The Bulletin"
      sub="A note on the classroom door, and the live sessions behind it."
    >
      <Panel title="Pin a note" sub="Short. It reads like something taped to a door, not an email.">
        <form onSubmit={post}>
          <textarea
            className="fac-textarea"
            rows={3}
            required
            minLength={3}
            maxLength={500}
            placeholder="What does the class need to know this week?"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="fac-row" style={{ marginTop: 12 }}>
            {roomsOn && rooms.length > 0 && (
              <label className="fac-field" style={{ marginBottom: 0 }}>
                <span className="fac-label">Who sees it</span>
                <select
                  className="fac-select"
                  value={homeroom}
                  onChange={(e) => setHomeroom(e.target.value)}
                >
                  <option value="">The whole school</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.count})
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="fac-field" style={{ marginBottom: 0 }}>
              <span className="fac-label">Take it down on</span>
              <input
                className="fac-input"
                type="date"
                value={until}
                onChange={(e) => setUntil(e.target.value)}
              />
            </label>
          </div>
          <div className="fac-item-actions">
            <button className="fac-btn fac-btn--go" type="submit" disabled={text.trim().length < 3}>
              Pin It
            </button>
            <button
              type="button"
              className={`fac-btn fac-btn--sm${pinned ? " fac-btn--go" : ""}`}
              onClick={() => setPinned((v) => !v)}
              aria-pressed={pinned}
            >
              {pinned ? "Holding the Top" : "Hold It at the Top"}
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="On the board" count={data?.notes.length} countTone="quiet" flush>
        {error ? (
          <Empty title="Could not read the board.">{error}</Empty>
        ) : !data ? (
          <div style={{ padding: 20 }}>
            <Skeleton rows={3} />
          </div>
        ) : data.notes.length === 0 ? (
          <Empty title="The board is empty.">
            Nothing pinned means nothing shows on anybody&apos;s desk.
          </Empty>
        ) : (
          data.notes.map((n) => (
            <article key={n.id} className="fac-item">
              <div className="fac-item-top">
                {n.pinned && <Tag tone="acc">Top of the board</Tag>}
                {n.homeroomName && <Tag tone="vio">{n.homeroomName} only</Tag>}
                {n.expired && <Tag tone="coral">Came down {usDate(n.until)}</Tag>}
                <span className="fac-when">
                  {n.author} · {usDate(n.created)}
                </span>
              </div>
              <p className="fac-said">{n.text}</p>
              <div className="fac-item-actions">
                <button
                  className="fac-btn fac-btn--sm fac-btn--quiet"
                  onClick={async () => {
                    await bulletinPin(token, n.id, !n.pinned);
                    reload();
                  }}
                >
                  {n.pinned ? "Let It Scroll" : "Hold It at the Top"}
                </button>
                <button
                  className="fac-btn fac-btn--sm fac-btn--quiet fac-btn--danger"
                  onClick={async () => {
                    const r = await apiBulletinDelete(token, n.id);
                    if (r.ok) {
                      reload();
                      flash("Taken down.");
                    }
                  }}
                >
                  Take Down
                </button>
              </div>
            </article>
          ))
        )}
      </Panel>

      <Panel
        title="Office Hours"
        sub="Real seats. Students RSVP until it is full, then a waitlist takes over and the server emails whoever gets promoted. The join link only ever goes to seat holders."
      >
        {sessions && sessions.length > 0 && (
          <div className="fac-table" style={{ marginBottom: 20 }}>
            {sessions.map((s) => (
              <div key={s.id} className="fac-tr" style={{ gridTemplateColumns: "minmax(0,1.6fr) 1fr auto" }}>
                <span style={{ fontWeight: 700 }}>{s.title}</span>
                <span className="fac-muted" data-k="When">
                  {usDate(s.startsAt)}{" "}
                  {new Date(s.startsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  {" · "}
                  {s.seats}/{s.capacity} in
                  {s.waiting > 0 && ` · ${s.waiting} waiting`}
                </span>
                <button
                  className="fac-btn fac-btn--sm fac-btn--quiet fac-btn--danger"
                  onClick={async () => {
                    const r = await apiSessionAct(token, "delete", s.id);
                    if (r.ok) {
                      setSessions((prev) => prev?.filter((x) => x.id !== s.id) ?? null);
                      flash("Cancelled. Seat holders were told.");
                    }
                  }}
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={createSession}>
          <label className="fac-field">
            <span className="fac-label">Title</span>
            <input
              className="fac-input"
              required
              minLength={3}
              maxLength={80}
              placeholder="Office Hours: Money Questions"
              value={sTitle}
              onChange={(e) => setSTitle(e.target.value)}
            />
          </label>
          <div className="fac-row">
            <label className="fac-field">
              <span className="fac-label">When</span>
              <input
                className="fac-input"
                type="datetime-local"
                required
                value={sWhen}
                onChange={(e) => setSWhen(e.target.value)}
              />
            </label>
            <label className="fac-field">
              <span className="fac-label">Minutes</span>
              <input
                className="fac-input"
                type="number"
                min={15}
                max={240}
                value={sDuration}
                onChange={(e) => setSDuration(e.target.value)}
              />
            </label>
            <label className="fac-field">
              <span className="fac-label">Seats</span>
              <input
                className="fac-input"
                type="number"
                min={1}
                max={500}
                required
                value={sCapacity}
                onChange={(e) => setSCapacity(e.target.value)}
              />
            </label>
          </div>
          <label className="fac-field">
            <span className="fac-label">Join link</span>
            <input
              className="fac-input"
              type="url"
              placeholder="Meet, Zoom, wherever class happens"
              value={sLink}
              onChange={(e) => setSLink(e.target.value)}
            />
          </label>
          <label className="fac-field">
            <span className="fac-label">One line about it</span>
            <input
              className="fac-input"
              maxLength={240}
              placeholder="Bring your real numbers."
              value={sBlurb}
              onChange={(e) => setSBlurb(e.target.value)}
            />
          </label>
          <button className="fac-btn fac-btn--go" type="submit">
            Put It on the Calendar
          </button>
        </form>
      </Panel>

      {flashNode}
    </Room>
  );
}
