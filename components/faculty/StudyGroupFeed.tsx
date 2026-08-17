"use client";

// Every Study Group post in the school, one list.
//
// Endorsing used to mean walking into thirty separate unit threads to find
// the one good answer. This is the same moderation power, in one place,
// sorted by what is actually waiting.

import Link from "next/link";
import { useState } from "react";
import { apiDiscussAct } from "@/lib/api";
import { ago, feedList, type FeedPost } from "@/lib/faculty";
import { Empty, Panel, Room, Skeleton, Tabs, Tag, useFacultyData, useFlash } from "./ui";
import StudentFile from "./StudentFile";

type Filter = "waiting" | "endorsed" | "all";

export default function StudyGroupFeed() {
  const [filter, setFilter] = useState<Filter>("waiting");
  const { data, error, reload, token } = useFacultyData<{
    posts: FeedPost[];
    counts: { waiting: number; endorsed: number; all: number };
  }>((t) => feedList(t, filter), [filter]);
  const { flash, node: flashNode } = useFlash();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <Room
      kicker="Faculty Lounge"
      title="Study Group"
      sub="Everything the class has said, newest first. Endorse the good answers and they get a Faculty mark in the thread."
    >
      <Panel
        title="Posts"
        flush
        actions={
          <Tabs<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { id: "waiting", label: "Unanswered", count: data?.counts.waiting },
              { id: "endorsed", label: "Endorsed", count: data?.counts.endorsed },
              { id: "all", label: "All", count: data?.counts.all },
            ]}
          />
        }
      >
        {error ? (
          <Empty title="Could not open the feed.">{error}</Empty>
        ) : !data ? (
          <div style={{ padding: 20 }}>
            <Skeleton rows={5} />
          </div>
        ) : data.posts.length === 0 ? (
          <Empty
            title={
              filter === "waiting"
                ? "Nobody is waiting on an answer."
                : filter === "endorsed"
                  ? "Nothing endorsed yet."
                  : "The Study Group is quiet."
            }
          >
            {filter === "waiting"
              ? "A thread drops off this list as soon as a member of staff posts in it."
              : "Endorsing an answer marks it for the whole class."}
          </Empty>
        ) : (
          data.posts.map((p) => (
            <article key={p.id} className="fac-item">
              <div className="fac-item-top">
                <button className="fac-who" onClick={() => setOpen(p.email)}>
                  {p.name}
                </button>
                {p.fromStaff && <Tag tone="vio">Staff</Tag>}
                {p.endorsed && <Tag tone="acc">Endorsed</Tag>}
                <span className="fac-where">
                  {p.unitTitle} · {p.courseTitle}
                </span>
                <span className="fac-when">{ago(p.created)}</span>
              </div>

              <p className="fac-said">{p.text}</p>

              <div className="fac-item-actions">
                <Link href={`/learn/${p.course}/${p.unit}/`} className="fac-btn fac-btn--sm fac-btn--go">
                  Open the Thread
                </Link>
                {!p.fromStaff && (
                  <button
                    className="fac-btn fac-btn--sm"
                    onClick={async () => {
                      const r = await apiDiscussAct(token, p.endorsed ? "unendorse" : "endorse", p.id);
                      if (r.ok) {
                        reload();
                        flash(p.endorsed ? "Endorsement removed." : "Marked as a Faculty answer.");
                      }
                    }}
                  >
                    {p.endorsed ? "Remove Endorsement" : "Endorse"}
                  </button>
                )}
                {p.ups > 0 && <span className="fac-hint">{p.ups} upvotes</span>}
                <button
                  className="fac-btn fac-btn--sm fac-btn--quiet fac-btn--danger"
                  onClick={async () => {
                    const r = await apiDiscussAct(token, "delete", p.id);
                    if (r.ok) {
                      reload();
                      flash("Taken down. It is on the log book.");
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

      {open && <StudentFile email={open} onClose={() => setOpen(null)} onChange={reload} flash={flash} />}
      {flashNode}
    </Room>
  );
}
