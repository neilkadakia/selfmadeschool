"use client";

// The Records Office.
//
// House rule, enforced on the server and repeated here: every number is
// computed from something the school actually stored. There is no
// completions-over-time chart because unit completions carry no timestamp,
// and inventing one would be worse than not having it. Where a number
// cannot be known, this page says so in words.

import { ROLE_RANK, rankOf } from "@/lib/api";
import { recordsCsv, recordsGet, type Records as RecordsData } from "@/lib/faculty";
import { Bars, Columns, Empty, Panel, Pulse, Room, Skeleton, Stat, useFacultyData } from "./ui";

export default function Records() {
  const { data, error, lms } = useFacultyData<RecordsData>(recordsGet);
  const isAdmin = rankOf(lms.auth?.role) >= ROLE_RANK.admin;

  if (error) {
    return (
      <Room kicker="Faculty Lounge" title="Records">
        <Empty title="Could not open the records.">{error}</Empty>
      </Room>
    );
  }

  if (!data) {
    return (
      <Room kicker="Faculty Lounge" title="Records">
        <Skeleton rows={7} />
      </Room>
    );
  }

  const p = data.pulse;
  const startRate = p.students > 0 ? Math.round((p.started / p.students) * 100) : 0;

  return (
    <Room
      kicker="Faculty Lounge"
      title="Records"
      sub="Everything the school can actually prove about itself. Nothing here is estimated."
      actions={
        isAdmin && (
          <>
            <a className="fac-btn" href={recordsCsv("students")} download>
              Students CSV
            </a>
            <a className="fac-btn" href={recordsCsv("funnel")} download>
              Funnel CSV
            </a>
          </>
        )
      }
    >
      <Pulse>
        <Stat n={p.students} label="Students" note={`${p.started} opened a unit`} />
        <Stat n={`${startRate}%`} label="Got started" tone={startRate >= 60 ? "acc" : "warn"} />
        <Stat n={p.activeWeek} label="Active this week" note={`${p.active30} this month`} />
        <Stat n={p.unitsDone} label="Units completed" />
        <Stat n={p.finalsPassed} label="Finals passed" />
        <Stat n={p.fieldworkFiled} label="Field Work filed" tone="acc" />
      </Pulse>

      {/* ---- attendance ---- */}
      <Panel
        title="Attendance, 30 days"
        sub="Students with any activity that day. Days nobody showed up are drawn empty, not skipped."
      >
        {data.active.every((d) => d.students === 0) ? (
          <Empty title="No activity recorded in the last 30 days." />
        ) : (
          <>
            <Columns
              rows={data.active.map((d) => ({ label: d.day, value: d.students }))}
              label="Active students per day over the last 30 days"
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 8,
                fontSize: 12,
              }}
              className="fac-dimmer"
            >
              <span>30 days ago</span>
              <span>today</span>
            </div>
          </>
        )}
      </Panel>

      {/* ---- where they stop ---- */}
      <Panel
        title="Where they stop"
        sub="How many students have finished each unit, in order. The cliff is where the course loses people."
      >
        {data.funnel.map((c) => {
          const taught = c.units.filter((u) => u.taught);
          if (taught.length === 0) return null;
          return (
            <div key={c.slug} style={{ marginBottom: 26 }}>
              <p className="fac-panel-h" style={{ marginBottom: 12 }}>
                {c.title}
              </p>
              <Bars
                rows={taught.map((u) => ({
                  label: `${u.number}. ${u.title}`,
                  value: u.done,
                  note: u.filed > 0 ? `${u.filed} filed Field Work` : undefined,
                  tone: c.tone,
                }))}
                max={Math.max(1, p.students)}
              />
            </div>
          );
        })}
      </Panel>

      {/* ---- the questions that are actually hard ---- */}
      <Panel
        title="Questions the class keeps missing"
        count={data.hard.length}
        countTone="quiet"
        sub="Every missed question lands in that student's make-up pile. Counted across the class, this is either a hard idea or a badly written question. Both are worth knowing."
        flush
      >
        {data.hard.length === 0 ? (
          <Empty title="Nothing is tripping people up.">
            Either the questions are landing, or not enough have been answered yet.
          </Empty>
        ) : (
          <div className="fac-table">
            <div
              className="fac-tr fac-tr--head"
              style={{ gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr) 80px 80px" }}
            >
              <span>Question</span>
              <span>Unit</span>
              <span>Students</span>
              <span>Misses</span>
            </div>
            {data.hard.map((h) => (
              <div
                key={h.key}
                className="fac-tr"
                style={{ gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr) 80px 80px" }}
              >
                <span data-k="Question">
                  <span className="fac-dimmer">Q{h.number}. </span>
                  {h.ask || <span className="fac-dimmer">(question has since been rewritten)</span>}
                </span>
                <span className="fac-muted" data-k="Unit" style={{ fontSize: 13 }}>
                  {h.unitTitle}
                </span>
                <span className="fac-num fac-warn" data-k="Students">
                  {h.students}
                </span>
                <span className="fac-num fac-muted" data-k="Misses">
                  {h.misses}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* ---- finals ---- */}
      <Panel title="Finals" sub="From the Registrar's own record, not the browser's.">
        {data.finals.every((f) => f.sitters === 0) ? (
          <Empty title="Nobody has sat a final yet.">
            A final unlocks once every written unit in a course is done.
          </Empty>
        ) : (
          <div className="fac-table">
            <div className="fac-tr fac-tr--head" style={{ gridTemplateColumns: "minmax(0,1.6fr) 90px 90px 90px 90px" }}>
              <span>Course</span>
              <span>Sat it</span>
              <span>Attempts</span>
              <span>Passed</span>
              <span>Avg score</span>
            </div>
            {data.finals
              .filter((f) => f.sitters > 0)
              .map((f) => (
                <div
                  key={f.slug}
                  className="fac-tr"
                  style={{ gridTemplateColumns: "minmax(0,1.6fr) 90px 90px 90px 90px" }}
                >
                  <span style={{ fontWeight: 700 }}>{f.title}</span>
                  <span className="fac-num" data-k="Sat it">
                    {f.sitters}
                  </span>
                  <span className="fac-num fac-muted" data-k="Attempts">
                    {f.attempts}
                  </span>
                  <span className="fac-num fac-good" data-k="Passed">
                    {f.passed} ({f.passRate}%)
                  </span>
                  <span className="fac-num fac-muted" data-k="Avg score">
                    {f.avgScore ?? "·"}
                  </span>
                </div>
              ))}
          </div>
        )}
      </Panel>

      {/* ---- the ladder, and signups for admins ---- */}
      <div style={{ display: "grid", gap: 22, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <Panel title="The ladder" sub="Where the class sits on the level ladder right now.">
          <Bars
            rows={data.levels.map((l) => ({ label: l.name, value: l.students, tone: "acc" }))}
            max={Math.max(1, ...data.levels.map((l) => l.students))}
          />
        </Panel>

        {data.signups ? (
          <Panel title="Signups, 12 weeks" sub="New accounts per week.">
            {data.signups.every((w) => w.signups === 0) ? (
              <Empty title="No new accounts in twelve weeks." />
            ) : (
              <Columns
                rows={data.signups.map((w) => ({ label: w.label, value: w.signups }))}
                label="New accounts per week over twelve weeks"
              />
            )}
          </Panel>
        ) : (
          <Panel title="Signups" sub="Who is signing up is the school's business, not a teaching number.">
            <Empty title="Administrators only.">
              Ask a member of the front office if you need enrollment figures.
            </Empty>
          </Panel>
        )}
      </div>

      <p className="fac-hint">
        Streaks: {p.onStreak} student{p.onStreak === 1 ? " is" : "s are"} on one right now, averaging{" "}
        {p.avgStreak} days.
      </p>
    </Room>
  );
}
