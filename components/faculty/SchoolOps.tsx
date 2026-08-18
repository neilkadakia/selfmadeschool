"use client";

// School Ops: the switches, the machines, and the log book.
//
// One person's room. The switches decide what kind of school this is, so
// they carry a plain warning about what happens the moment they move, and
// nothing here does anything clever without saying so first.

import { useEffect, useState } from "react";
import {
  apiBackupInfo,
  apiBackupRun,
  apiNudgeInfo,
  apiNudgeRun,
  apiSessions,
} from "@/lib/api";
import { auditGet, schoolAdmin, schoolFeatures, type AuditEntry, type Features, type SchoolAdmin } from "@/lib/faculty";
import { usDate } from "@/lib/format";
import { Empty, Panel, Room, Skeleton, Tabs, Tag, Toggle, useFacultyData, useFlash } from "./ui";

type Tab = "switches" | "machines" | "log";

const SWITCHES: { id: keyof Features; name: string; blurb: string; warn?: string }[] = [
  {
    id: "paid",
    name: "Charge for courses",
    blurb:
      "Course access starts running through plans. Build the plans in Enrollment first, and check the table there to see exactly who ends up locked out.",
    warn: "Students not covered by an active plan lose access the moment this goes on.",
  },
  {
    id: "deadlines",
    name: "Assignments can have due dates",
    blurb:
      "An assignment grows an optional due date, and the Gradebook starts flagging what has slipped. Off, an assignment is an invitation with a note on it and no clock.",
  },
  {
    id: "homerooms",
    name: "Homerooms",
    blurb:
      "Named groups of students. The Gradebook can filter by one, the Bulletin can address one, and an assignment can go to a whole room at once.",
  },
  {
    id: "fieldwork",
    name: "Field Work review",
    blurb: "Faculty read what students filed about the real world and write back. This is the best thing in the building.",
  },
  {
    id: "honorRoll",
    name: "Honor Roll",
    blurb: "Students see the weekly and all-time leaderboards.",
  },
  {
    id: "prereqs",
    name: "Courses run in order",
    blurb:
      "The 14th needs the 13th finished, the 15th needs the 14th. Off, the three grades are open in any order, which is how the school opened.",
    warn: "Students part-way through a later course keep what they have done, but cannot open it again until the one before it is finished.",
  },
  {
    id: "forms",
    name: "Ask the school",
    blurb:
      "Faculty put a question to the school, or to one homeroom, and see the answers. Polls count; open questions collect sentences.",
  },
  {
    id: "broadcast",
    name: "Broadcast",
    blurb:
      "One composer, sent to everybody or to one homeroom or one course, landing on the bell and optionally in the inbox, with a record of who it reached.",
  },
  {
    id: "calendarLinks",
    name: "Google and Outlook links",
    blurb:
      "Office Hours offers both alongside the .ics file. Off, the download is the only way to put a session in a calendar.",
  },
  {
    id: "certVerify",
    name: "Verifiable certificates",
    blurb:
      "Every certificate carries a code, and anyone can check it at /verify without signing in. The check answers with the name, the course and the date, and nothing else.",
  },
];

export default function SchoolOps() {
  const { data, error, reload, token } = useFacultyData<SchoolAdmin>(schoolAdmin);
  const { flash, node: flashNode } = useFlash();
  const [tab, setTab] = useState<Tab>("switches");
  const [cronUrl, setCronUrl] = useState("");
  const [nudgeCron, setNudgeCron] = useState("");
  const [sessionCron, setSessionCron] = useState("");
  const [log, setLog] = useState<AuditEntry[] | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    void apiBackupInfo(token).then((r) => {
      if (r.ok) setCronUrl(r.data.cronUrl as string);
    });
    void apiNudgeInfo(token).then((r) => {
      if (r.ok) setNudgeCron(r.data.cronUrl as string);
    });
    void apiSessions(token).then((r) => {
      if (r.ok && r.data.cronUrl) setSessionCron(r.data.cronUrl as string);
    });
  }, [token]);

  useEffect(() => {
    if (!token || tab !== "log") return;
    void auditGet(token, q).then((r) => {
      if (r.ok) setLog(r.data.entries as AuditEntry[]);
    });
  }, [token, tab, q]);

  const copy = (text: string, said: string) => {
    void navigator.clipboard.writeText(text).then(() => flash(said));
  };

  return (
    <Room
      kicker="Faculty Lounge"
      title="School Ops"
      sub="What kind of school this is, the jobs that run it, and the record of who did what."
      actions={
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { id: "switches", label: "Switches" },
            { id: "machines", label: "Machines" },
            { id: "log", label: "Log Book" },
          ]}
        />
      }
    >
      {tab === "switches" && (
        <Panel
          title="What kind of school this is"
          sub={
            data?.updated
              ? `Last changed ${usDate(data.updated)} by ${data.updatedBy}.`
              : "Never changed. Everything is at its opening setting."
          }
        >
          {error ? (
            <Empty title="Could not read the settings.">{error}</Empty>
          ) : !data ? (
            <Skeleton rows={5} />
          ) : (
            SWITCHES.map((s) => {
              const on = data.features[s.id];
              return (
                <div key={s.id} className="fac-switch">
                  <div className="fac-switch-text">
                    <p className="fac-switch-name">
                      {s.name} {on && <Tag tone="acc">On</Tag>}
                    </p>
                    <p className="fac-switch-blurb">{s.blurb}</p>
                    {s.warn && !on && (
                      <p className="fac-switch-blurb fac-warn" style={{ marginTop: 6 }}>
                        {s.warn}
                      </p>
                    )}
                  </div>
                  <Toggle
                    on={on}
                    label={s.name}
                    disabled={busy}
                    onChange={async (next) => {
                      setBusy(true);
                      const r = await schoolFeatures(token, { [s.id]: next } as Partial<Features>);
                      setBusy(false);
                      if (r.ok) {
                        reload();
                        flash(`${s.name}: ${next ? "on" : "off"}.`);
                      } else {
                        flash((r.data.error as string) ?? "Could not change that.");
                      }
                    }}
                  />
                </div>
              );
            })
          )}
        </Panel>
      )}

      {tab === "machines" && (
        <>
          <Panel
            title="Backups"
            sub="Zips every data store into sms-lms-backups next to the data folder, newest fourteen kept. For a nightly run, add a cron job in Hostinger's hPanel under Advanced, Cron Jobs."
          >
            {cronUrl && (
              <div className="fac-item-actions" style={{ marginBottom: 14 }}>
                <code
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: "auto",
                    fontSize: 12.5,
                    padding: "9px 12px",
                    borderRadius: 9,
                    background: "rgba(14,14,18,0.6)",
                    border: "1px solid rgba(242,238,227,0.11)",
                  }}
                >
                  curl -s &quot;{cronUrl}&quot; &gt; /dev/null
                </code>
                <button
                  className="fac-btn fac-btn--sm"
                  onClick={() => copy(`curl -s "${cronUrl}" > /dev/null`, "Cron command copied.")}
                >
                  Copy
                </button>
              </div>
            )}
            <button
              className="fac-btn"
              onClick={async () => {
                const r = await apiBackupRun(token);
                flash(
                  r.ok
                    ? `Backup saved: ${r.data.file as string} (${r.data.stores as number} stores).`
                    : ((r.data.error as string) ?? "Backup failed.")
                );
              }}
            >
              Run a Backup Now
            </button>
          </Panel>

          <Panel
            title="The nudge desk"
            sub="One email at most per student per run: a dying streak first, then a waiting final, an almost-finished course, or a quiet week. Cooldowns keep it polite, and students switch it off in their Student File. Run it in the evening, when a streak can still be saved."
          >
            {nudgeCron && (
              <div className="fac-item-actions" style={{ marginBottom: 14 }}>
                <code
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: "auto",
                    fontSize: 12.5,
                    padding: "9px 12px",
                    borderRadius: 9,
                    background: "rgba(14,14,18,0.6)",
                    border: "1px solid rgba(242,238,227,0.11)",
                  }}
                >
                  curl -s &quot;{nudgeCron}&quot; &gt; /dev/null
                </code>
                <button
                  className="fac-btn fac-btn--sm"
                  onClick={() => copy(`curl -s "${nudgeCron}" > /dev/null`, "Nudge cron copied.")}
                >
                  Copy
                </button>
              </div>
            )}
            <div className="fac-item-actions">
              <button
                className="fac-btn"
                onClick={async () => {
                  const r = await apiNudgeRun(token, true);
                  if (!r.ok) {
                    flash((r.data.error as string) ?? "Dry run failed.");
                    return;
                  }
                  const list = (r.data.nudges as { email: string; type: string }[]) ?? [];
                  flash(
                    list.length === 0
                      ? "Dry run: nobody needs a nudge right now."
                      : `Dry run: would email ${list.length}. ${list.map((n) => `${n.email} (${n.type})`).join(", ").slice(0, 200)}`
                  );
                }}
              >
                Dry Run
              </button>
              <button
                className="fac-btn"
                onClick={async () => {
                  const r = await apiNudgeRun(token, false);
                  flash(
                    r.ok
                      ? `Nudges sent: ${r.data.sent as number} (${r.data.optedOut as number} opted out).`
                      : ((r.data.error as string) ?? "Nudge run failed.")
                  );
                }}
              >
                Send Nudges Now
              </button>
            </div>
          </Panel>

          <Panel
            title="Office Hours reminders"
            sub="Emails everybody holding a seat once, the day before their session starts. Nobody hears about the same session twice, so running this hourly is safe and running it daily is enough."
          >
            {sessionCron ? (
              <div className="fac-item-actions">
                <code
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: "auto",
                    fontSize: 12.5,
                    padding: "9px 12px",
                    borderRadius: 9,
                    background: "rgba(14,14,18,0.6)",
                    border: "1px solid rgba(242,238,227,0.11)",
                  }}
                >
                  curl -s &quot;{sessionCron}&quot; &gt; /dev/null
                </code>
                <button
                  className="fac-btn fac-btn--sm"
                  onClick={() => copy(`curl -s "${sessionCron}" > /dev/null`, "Reminder cron copied.")}
                >
                  Copy
                </button>
              </div>
            ) : (
              <p className="fac-panel-sub">Nothing scheduled yet, so there is nothing to remind anybody about.</p>
            )}
          </Panel>

          <Panel title="Uptime">
            <p className="fac-panel-sub">
              Point a free monitor at <code>/api/health.php</code>. It answers with the PHP version, whether
              the data directory is writable, and where it is. That last one matters: if it ever reports
              local instead of external, a deploy has put the school&apos;s data somewhere it can be
              overwritten.
            </p>
          </Panel>
        </>
      )}

      {tab === "log" && (
        <Panel
          title="Log Book"
          sub="Every staff action that touches somebody else's account. Read only: nothing in the app can edit or clear it, and work done during an Act As session is recorded under the person really driving."
          flush
          actions={
            <input
              className="fac-input"
              style={{ width: 220 }}
              type="search"
              placeholder="Find an action or a name"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search the log book"
            />
          }
        >
          {!log ? (
            <div style={{ padding: 20 }}>
              <Skeleton rows={5} />
            </div>
          ) : log.length === 0 ? (
            <Empty title={q ? "Nothing matches that." : "Nothing on the record yet."}>
              {q ? "Try a different word." : "Role changes, Act As, takedowns and grants land here as they happen."}
            </Empty>
          ) : (
            <div className="fac-table">
              <div
                className="fac-tr fac-tr--head"
                style={{ gridTemplateColumns: "150px minmax(0,1fr) 160px minmax(0,1.2fr) minmax(0,1.4fr)" }}
              >
                <span>When</span>
                <span>Who</span>
                <span>Did what</span>
                <span>To</span>
                <span>Detail</span>
              </div>
              {log.map((e, i) => (
                <div
                  key={`${e.at}-${i}`}
                  className="fac-tr"
                  style={{ gridTemplateColumns: "150px minmax(0,1fr) 160px minmax(0,1.2fr) minmax(0,1.4fr)" }}
                >
                  <span className="fac-dimmer" style={{ fontSize: 12.5 }}>
                    {usDate(e.at)}{" "}
                    {new Date(e.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </span>
                  <span data-k="Who">
                    {e.actorName}
                    {e.asName && <span className="fac-dimmer"> as {e.asName}</span>}
                  </span>
                  <span data-k="Did what" className="fac-muted" style={{ fontSize: 13 }}>
                    <code>{e.action}</code>
                  </span>
                  <span data-k="To" className="fac-muted">
                    {e.subjectName || "·"}
                  </span>
                  <span data-k="Detail" className="fac-dimmer" style={{ fontSize: 12.5 }}>
                    {e.detail}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {flashNode}
    </Room>
  );
}
