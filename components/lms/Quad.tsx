"use client";

// The Quad: the school with other people in it.
//
// Clubs are rooms. Each has its own members, its own feed and its own
// posting rule, and the course clubs come from the catalog so the place is
// never an empty room on day one.
//
// The feed only carries things that can prove when they happened: posts,
// kudos and passed finals. Unit completions carry no timestamp, so they are
// not in here and should not be added.

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { isFaculty } from "@/lib/api";
import { usDate } from "@/lib/format";
import { useLms } from "@/components/useLms";
import {
  quadClubs,
  quadClub,
  quadFeed,
  quadJoin,
  quadPost,
  quadComment,
  quadReact,
  quadAct,
  quadDeleteComment,
  REACTIONS,
  REACTION_LABEL,
  POST_KIND_LABEL,
  type Club,
  type QuadPost,
  type FeedEvent,
  type Reaction,
  type PostKind,
} from "@/lib/quad";

// Line icons, 24px, never emoji.
const REACTION_PATH: Record<Reaction, string> = {
  like: "M7 10v10H4V10h3zm3 10h7.5a2 2 0 0 0 1.94-1.5l1.5-6A2 2 0 0 0 19 10h-4.5l.7-3.4A1.6 1.6 0 0 0 13.6 4.6L10 10v10z",
  celebrate:
    "M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8",
  insightful:
    "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.5.4.8 1 .9 1.6l.1.6h5.2l.1-.6c.1-.6.4-1.2.9-1.6A6 6 0 0 0 12 3z",
  support: "M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9z",
};

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export default function Quad() {
  const lms = useLms();
  const token = lms.auth?.token ?? "";
  const faculty = isFaculty(lms.auth?.role);

  const [clubs, setClubs] = useState<Club[] | null>(null);
  const [feed, setFeed] = useState<FeedEvent[] | null>(null);
  const [openId, setOpenId] = useState("");
  const [room, setRoom] = useState<{ club: Club; posts: QuadPost[] } | null>(null);
  const [offline, setOffline] = useState(false);

  const loadHome = useCallback(() => {
    if (!token) return;
    void Promise.all([quadClubs(token), quadFeed(token)]).then(([c, f]) => {
      if (c.status === 0 || f.status === 0) {
        setOffline(true);
        return;
      }
      setOffline(false);
      if (c.ok) setClubs((c.data.clubs as Club[]) ?? []);
      if (f.ok) setFeed((f.data.feed as FeedEvent[]) ?? []);
    });
  }, [token]);

  const loadRoom = useCallback(
    (id: string) => {
      if (!token || !id) return;
      void quadClub(token, id).then((r) => {
        if (r.ok) setRoom({ club: r.data.club as Club, posts: (r.data.posts as QuadPost[]) ?? [] });
      });
    },
    [token]
  );

  useEffect(() => {
    loadHome();
  }, [loadHome]);

  // Opening a room clears the last one first, so walking between clubs never
  // shows the previous room's posts under the new room's name.
  const openClub = (id: string) => {
    setOpenId(id);
    setRoom(null);
    loadRoom(id);
  };

  if (!token) return null;

  const join = async (id: string, next: boolean) => {
    await quadJoin(token, id, next);
    loadHome();
    if (openId === id) loadRoom(id);
  };

  return (
    <div className="quad">
      {/* Inside a room the club's own name is the heading; two of them stacked
          just pushes the conversation down the page. */}
      {!openId && (
        <header className="learn-head">
          <p className="kicker kicker--acc">The Quad</p>
          <h1 className="learn-h1">The school, out loud.</h1>
          <p className="learn-sub">
            Clubs are rooms: join the ones you want, say something, and the rest of the class hears
            it. Everything here is public to the school and nothing here is private mail.
          </p>
        </header>
      )}

      {offline && <p className="lms-muted">The Quad needs a connection. It&apos;ll be here when you&apos;re back.</p>}

      {openId && room ? (
        <Room
          room={room}
          faculty={faculty}
          token={token}
          onBack={() => openClub("")}
          onJoin={join}
          reload={() => {
            loadRoom(openId);
            loadHome();
          }}
        />
      ) : (
        <div className="quad-cols">
          <section className="quad-feed" aria-label="What is happening">
            <h2 className="lms-section-h">Lately</h2>
            {feed && feed.length === 0 && (
              <p className="lms-muted">
                Quiet so far. Join a club and the room starts talking. Whatever you post here, the
                class sees.
              </p>
            )}
            {feed?.map((e, i) => (
              <FeedRow key={`${e.type}-${e.at}-${i}`} event={e} onOpen={openClub} />
            ))}
          </section>

          <section className="quad-rooms" aria-label="Clubs">
            <h2 className="lms-section-h">Clubs</h2>
            {clubs?.map((c) => (
              <article key={c.id} className={`quad-club tone-${c.tone}${c.joined ? " is-in" : ""}`}>
                <button className="quad-club-open" onClick={() => c.open && openClub(c.id)} disabled={!c.open}>
                  <span className="quad-club-name">{c.name}</span>
                  <span className="quad-club-blurb">{c.blurb}</span>
                </button>
                <div className="quad-club-foot">
                  <span className="quad-club-count">
                    {c.members} {c.members === 1 ? "member" : "members"} · {c.posts}{" "}
                    {c.posts === 1 ? "post" : "posts"}
                  </span>
                  {c.open ? (
                    <button
                      className={`quad-join${c.joined ? " is-in" : ""}`}
                      aria-pressed={c.joined}
                      onClick={() => void join(c.id, !c.joined)}
                    >
                      {c.joined ? "Joined" : "Join"}
                    </button>
                  ) : (
                    <Link href={`/learn/${c.course}`} className="quad-join">
                      Enroll First
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}

function FeedRow({ event, onOpen }: { event: FeedEvent; onOpen: (id: string) => void }) {
  if (event.type === "kudos") {
    return (
      <div className="quad-event">
        <span className="quad-event-tag">Kudos</span>
        <p className="quad-event-text">
          <strong>{event.name}</strong> gave kudos to{" "}
          <strong>{event.yours ? "you" : event.toName}</strong>
          {event.text ? <>: “{event.text}”</> : "."}
        </p>
        <span className="quad-event-date">{usDate(event.at)}</span>
      </div>
    );
  }
  if (event.type === "challenge") {
    return (
      <div className="quad-event">
        <span className="quad-event-tag">Challenge</span>
        <p className="quad-event-text">
          <strong>{event.yours ? "You" : event.name}</strong> finished{" "}
          <strong>{event.text}</strong>.
        </p>
        <span className="quad-event-date">{usDate(event.at)}</span>
      </div>
    );
  }
  if (event.type === "final") {
    return (
      <div className="quad-event">
        <span className="quad-event-tag">Final</span>
        <p className="quad-event-text">
          <strong>{event.yours ? "You" : event.name}</strong> passed the final for{" "}
          <strong>{event.text}</strong>.
        </p>
        <span className="quad-event-date">{usDate(event.at)}</span>
      </div>
    );
  }
  return (
    <button className="quad-event quad-event--post" onClick={() => onOpen(event.club ?? "")}>
      <span className="quad-event-tag">{POST_KIND_LABEL[event.kind ?? "discussion"]}</span>
      <p className="quad-event-text">
        <strong>{event.name}</strong> in {event.clubName}
      </p>
      <p className="quad-event-quote">{event.text}</p>
      <span className="quad-event-date">
        {usDate(event.at)}
        {event.comments ? ` · ${event.comments} ${event.comments === 1 ? "reply" : "replies"}` : ""}
      </span>
    </button>
  );
}

function Room({
  room,
  faculty,
  token,
  onBack,
  onJoin,
  reload,
}: {
  room: { club: Club; posts: QuadPost[] };
  faculty: boolean;
  token: string;
  onBack: () => void;
  onJoin: (id: string, next: boolean) => Promise<void>;
  reload: () => void;
}) {
  const { club, posts } = room;
  const [text, setText] = useState("");
  const [kind, setKind] = useState<PostKind>("discussion");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || text.trim().length < 3) return;
    setBusy(true);
    setError("");
    const r = await quadPost(token, club.id, text.trim(), kind);
    setBusy(false);
    if (r.ok) {
      setText("");
      reload();
    } else {
      setError((r.data.error as string) ?? "Could not post that. Try again.");
    }
  };

  return (
    <section className="quad-room" aria-label={club.name}>
      <button className="quad-back" onClick={onBack}>
        ← All Clubs
      </button>
      <div className="quad-room-head">
        <div>
          <h2 className="learn-h1 quad-room-h">{club.name}</h2>
          <p className="learn-sub">{club.blurb}</p>
        </div>
        <button
          className={`quad-join${club.joined ? " is-in" : ""}`}
          aria-pressed={club.joined}
          onClick={() => void onJoin(club.id, !club.joined)}
        >
          {club.joined ? "Joined" : "Join"}
        </button>
      </div>

      {!club.staffOnly && (
        <form className="quad-composer" onSubmit={submit}>
          <div className="quad-kinds">
            {(Object.keys(POST_KIND_LABEL) as PostKind[]).map((k) => (
              <button
                key={k}
                type="button"
                className={`quad-kind${kind === k ? " is-on" : ""}`}
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
              >
                {POST_KIND_LABEL[k]}
              </button>
            ))}
          </div>
          <textarea
            className="lms-notes"
            rows={3}
            maxLength={1200}
            placeholder="Say the useful version. What happened, what you tried, where you are stuck."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {error && (
            <p className="lms-login-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn--outline lms-login-btn" type="submit" disabled={busy}>
            {busy ? "Posting…" : "Post to the Club"}
          </button>
        </form>
      )}

      {posts.length === 0 && (
        <p className="lms-muted">
          Nothing in here yet. Somebody has to go first, and it may as well be the person reading
          this.
        </p>
      )}

      {posts.map((p) => (
        <Post key={p.id} post={p} faculty={faculty} token={token} reload={reload} />
      ))}
    </section>
  );
}

function Post({
  post,
  faculty,
  token,
  reload,
}: {
  post: QuadPost;
  faculty: boolean;
  token: string;
  reload: () => void;
}) {
  const [reply, setReply] = useState("");
  const [open, setOpen] = useState(false);

  const react = async (r: Reaction) => {
    await quadReact(token, post.id, r);
    reload();
  };

  const act = async (a: Parameters<typeof quadAct>[1]) => {
    await quadAct(token, a, post.id);
    reload();
  };

  const sendReply = async (e: FormEvent) => {
    e.preventDefault();
    if (reply.trim().length < 3) return;
    const r = await quadComment(token, post.id, reply.trim());
    if (r.ok) {
      setReply("");
      reload();
    }
  };

  return (
    <article className={`quad-post${post.pinned ? " is-pinned" : ""}`}>
      <div className="quad-post-head">
        <span className="quad-post-name">
          {post.name}
          {post.staff && <span className="quad-post-badge">Faculty</span>}
          {post.pinned && <span className="quad-post-badge is-pin">Pinned</span>}
          {post.locked && <span className="quad-post-badge">Closed</span>}
        </span>
        <span className="quad-post-meta">
          {POST_KIND_LABEL[post.kind]} · {usDate(post.created)}
        </span>
      </div>
      <p className="quad-post-text">{post.text}</p>

      <div className="quad-reacts">
        {REACTIONS.map((r) => {
          const on = post.yours.includes(r);
          return (
            <button
              key={r}
              className={`quad-react${on ? " is-on" : ""}`}
              aria-pressed={on}
              aria-label={REACTION_LABEL[r]}
              disabled={post.mine}
              onClick={() => void react(r)}
            >
              <Icon d={REACTION_PATH[r]} />
              <span>{post.reactions[r] ?? 0}</span>
            </button>
          );
        })}
        <button className="quad-post-act" onClick={() => setOpen((v) => !v)}>
          {post.comments.length === 0
            ? "Reply"
            : `${post.comments.length} ${post.comments.length === 1 ? "Reply" : "Replies"}`}
        </button>
        {!post.mine && (
          <button className="quad-post-act" onClick={() => void act("report")}>
            Report
          </button>
        )}
        {faculty && (
          <>
            <button className="quad-post-act" onClick={() => void act(post.pinned ? "unpin" : "pin")}>
              {post.pinned ? "Unpin" : "Pin"}
            </button>
            <button className="quad-post-act" onClick={() => void act(post.locked ? "unlock" : "lock")}>
              {post.locked ? "Reopen" : "Close"}
            </button>
          </>
        )}
        {(post.mine || faculty) && (
          <button className="quad-post-act" onClick={() => void act("delete")}>
            Take Down
          </button>
        )}
      </div>

      {(open || post.comments.length > 0) && (
        <div className="quad-comments">
          {post.comments.map((c) => (
            <div key={c.id} className="quad-comment">
              <span className="quad-comment-name">
                {c.name}
                {c.staff && <span className="quad-post-badge">Faculty</span>}
              </span>
              <p className="quad-comment-text">{c.text}</p>
              <span className="quad-comment-date">{usDate(c.created)}</span>
              {(c.mine || faculty) && (
                <button
                  className="quad-post-act"
                  onClick={() => {
                    void quadDeleteComment(token, post.id, c.id).then(reload);
                  }}
                >
                  Take Down
                </button>
              )}
            </div>
          ))}
          {!post.locked && (
            <form className="quad-reply" onSubmit={sendReply}>
              <input
                className="lms-input"
                maxLength={600}
                placeholder="Say something useful."
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
              <button className="btn btn--outline" type="submit">
                Reply
              </button>
            </form>
          )}
        </div>
      )}
    </article>
  );
}
