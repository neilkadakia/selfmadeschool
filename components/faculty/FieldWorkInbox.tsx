"use client";

// The Field Work inbox.
//
// This is the room that changes what the school is. Everywhere else a
// teacher looks at numbers about students; here they read what a student
// actually did on a Tuesday and say something back about it.
//
// So the layout gets out of the way. The student's words are the biggest
// thing on the row. The assignment they were answering sits above in small
// grey type, because a teacher reading forty of these should not have to
// remember what was asked.

import { useState } from "react";
import { usDate } from "@/lib/format";
import { fwDelete, fwInbox, recordsCsv, type InboxCounts, type InboxFiling } from "@/lib/faculty";
import { Empty, Panel, Room, Skeleton, Tabs, useFacultyData, useFlash } from "./ui";
import ReplyBox from "./ReplyBox";
import StudentFile from "./StudentFile";

type Filter = "waiting" | "answered" | "all";

export default function FieldWorkInbox() {
  const [filter, setFilter] = useState<Filter>("waiting");
  const { data, error, reload, token } = useFacultyData<{ filings: InboxFiling[]; counts: InboxCounts }>(
    (t) => fwInbox(t, filter),
    [filter]
  );
  const { flash, node: flashNode } = useFlash();
  const [replying, setReplying] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const rowKey = (f: InboxFiling) => `${f.email}|${f.key}`;

  return (
    <Room
      kicker="Faculty Lounge"
      title="Field Work"
      sub="The unit's homework is their actual life. This is what came back, and where you answer it."
      actions={
        <a className="fac-btn" href={recordsCsv("fieldwork")} download>
          Export CSV
        </a>
      }
    >
      <Panel
        title="Filings"
        flush
        actions={
          <Tabs<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { id: "waiting", label: "Waiting", count: data?.counts.waiting },
              { id: "answered", label: "Answered", count: data?.counts.answered },
              { id: "all", label: "All" },
            ]}
          />
        }
      >
        {error ? (
          <Empty title="Could not open the inbox.">{error}</Empty>
        ) : !data ? (
          <div style={{ padding: 20 }}>
            <Skeleton rows={5} />
          </div>
        ) : data.filings.length === 0 ? (
          <Empty
            title={
              filter === "waiting"
                ? "Everything has an answer."
                : filter === "answered"
                  ? "Nothing answered yet."
                  : "No Field Work filed yet."
            }
          >
            {filter === "waiting"
              ? "Nobody is waiting to hear back from the school."
              : "Filings show up here the moment a student writes one."}
          </Empty>
        ) : (
          data.filings.map((f) => {
            const k = rowKey(f);
            return (
              <article key={k} className="fac-item">
                <div className="fac-item-top">
                  <button className="fac-who" onClick={() => setOpen(f.email)}>
                    {f.name}
                  </button>
                  <span className="fac-where">
                    {f.unitTitle} · {f.courseTitle}
                  </span>
                  <span className="fac-when">{f.date ? usDate(f.date) : ""}</span>
                </div>

                {f.action && <p className="fac-asked">Asked: {f.action}</p>}

                {f.note ? (
                  <p className="fac-said">{f.note}</p>
                ) : (
                  <p className="fac-hint">
                    Filed with no note. They did it and moved on, which is allowed.
                  </p>
                )}

                {f.reply && replying !== k && (
                  <div className="fac-answer">
                    <p className="fac-answer-by">{f.reply.byName} answered</p>
                    <p className="fac-answer-text">{f.reply.text}</p>
                    <p className="fac-answer-seen">
                      {usDate(f.reply.at)} · {f.reply.seen ? "Read" : "Not read yet"}
                    </p>
                  </div>
                )}

                {replying === k ? (
                  <ReplyBox
                    token={token}
                    email={f.email}
                    unitKey={f.key}
                    name={f.name}
                    initial={f.reply?.text ?? ""}
                    onDone={() => {
                      setReplying(null);
                      reload();
                      flash(`Answered ${f.name.split(" ")[0]}.`);
                    }}
                    onCancel={() => setReplying(null)}
                  />
                ) : (
                  f.note && (
                    <div className="fac-item-actions">
                      <button
                        className={`fac-btn fac-btn--sm${f.reply ? "" : " fac-btn--go"}`}
                        onClick={() => setReplying(k)}
                      >
                        {f.reply ? "Edit the Answer" : "Write Back"}
                      </button>
                      <button className="fac-btn fac-btn--sm fac-btn--quiet" onClick={() => setOpen(f.email)}>
                        Open Their File
                      </button>
                      {f.reply && (
                        <button
                          className="fac-btn fac-btn--sm fac-btn--quiet fac-btn--danger"
                          onClick={async () => {
                            await fwDelete(token, f.email, f.key);
                            reload();
                            flash("Answer taken down.");
                          }}
                        >
                          Take It Down
                        </button>
                      )}
                    </div>
                  )
                )}
              </article>
            );
          })
        )}
      </Panel>

      {open && <StudentFile email={open} onClose={() => setOpen(null)} onChange={reload} flash={flash} />}
      {flashNode}
    </Room>
  );
}
