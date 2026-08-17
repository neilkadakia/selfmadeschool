"use client";

// The Gradebook: one row per student, sortable, searchable, and openable.
//
// The dot strip under each row is the whole curriculum at a glance. A
// filled dot is a finished unit, a hollow one is a unit nobody has written
// yet. That second state matters: without it, a student who has done
// everything available looks like a student who has done a third of the
// course.

import { useMemo, useState } from "react";
import { ago, facRoster, recordsCsv, type Roster, type RosterRow } from "@/lib/faculty";
import { ROLE_LABEL, ROLE_RANK, rankOf, type Role } from "@/lib/api";
import { Empty, Panel, Room, Skeleton, Tabs, Tag, useFacultyData, useFlash, useSort, useSorted } from "./ui";
import StudentFile from "./StudentFile";

type SortKey = "name" | "units" | "xp" | "streak" | "finals" | "fieldwork" | "lastActive";
type Who = "students" | "staff" | "all";

const COLS = "minmax(0,1.5fr) 74px 82px 74px 74px 84px 104px";

export default function Gradebook() {
  const { data, error, reload, lms } = useFacultyData<Roster>(facRoster);
  const { flash, node: flashNode } = useFlash();
  const [open, setOpen] = useState<string | null>(null);
  const [who, setWho] = useState<Who>("students");
  const [room, setRoom] = useState("");
  const [q, setQ] = useState("");
  const { key, desc, header } = useSort<SortKey>("xp");

  const myRank = rankOf(lms.auth?.role);

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.students.filter((s) => {
      const isStaff = rankOf(s.role) >= ROLE_RANK.educator;
      if (who === "students" && isStaff) return false;
      if (who === "staff" && !isStaff) return false;
      if (room && s.homeroom !== room) return false;
      if (!needle) return true;
      return s.name.toLowerCase().includes(needle) || s.email.toLowerCase().includes(needle);
    });
  }, [data, who, room, q]);

  const rows = useSorted<RosterRow>(filtered, key, desc);

  if (error) {
    return (
      <Room kicker="Faculty Lounge" title="Gradebook">
        <Empty title="Could not open the gradebook.">{error}</Empty>
      </Room>
    );
  }

  if (!data) {
    return (
      <Room kicker="Faculty Lounge" title="Gradebook">
        <Skeleton rows={7} />
      </Room>
    );
  }

  const students = data.students.filter((s) => rankOf(s.role) < ROLE_RANK.educator);
  const rooms = data.homerooms;

  return (
    <Room
      kicker="Faculty Lounge"
      title="Gradebook"
      sub={`${students.length} student${students.length === 1 ? "" : "s"}. Click any row to open their file.`}
      actions={
        myRank >= ROLE_RANK.educator && (
          <a className="fac-btn" href={recordsCsv("students")} download>
            Export CSV
          </a>
        )
      }
    >
      <Panel
        title="The class"
        flush
        actions={
          <>
            <input
              className="fac-input"
              style={{ width: 200 }}
              type="search"
              placeholder="Find a student"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Find a student"
            />
            {data.settings.homerooms && rooms.length > 0 && (
              <select
                className="fac-select"
                style={{ width: 170 }}
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                aria-label="Filter by homeroom"
              >
                <option value="">Every homeroom</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            )}
            <Tabs<Who>
              value={who}
              onChange={setWho}
              options={[
                { id: "students", label: "Students" },
                { id: "staff", label: "Staff" },
                { id: "all", label: "Everyone" },
              ]}
            />
          </>
        }
      >
        {rows.length === 0 ? (
          <Empty title="Nobody matches that.">Try a different name, or clear the filters.</Empty>
        ) : (
          <div className="fac-table">
            <div className="fac-tr fac-tr--head" style={{ gridTemplateColumns: COLS }}>
              {header("name", "Student")}
              {header("units", "Units")}
              {header("xp", "XP")}
              {header("streak", "Streak")}
              {header("finals", "Finals")}
              {header("fieldwork", "Field Work")}
              {header("lastActive", "Last seen")}
            </div>

            {rows.map((s) => (
              <div key={s.email}>
                <div
                  className="fac-tr fac-tr--click"
                  style={{ gridTemplateColumns: COLS }}
                  role="button"
                  tabIndex={0}
                  onClick={() => setOpen(s.email)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setOpen(s.email);
                    }
                  }}
                >
                  <span>
                    <span style={{ fontWeight: 700 }}>{s.name || s.email}</span>
                    {rankOf(s.role) >= ROLE_RANK.educator && (
                      <>
                        {" "}
                        <Tag tone={s.role === "global_admin" ? "coral" : s.role === "admin" ? "vio" : undefined}>
                          {ROLE_LABEL[s.role as Role] ?? s.role}
                        </Tag>
                      </>
                    )}
                  </span>
                  <span className="fac-num" data-k="Units">
                    {s.units}
                  </span>
                  <span className="fac-num" data-k="XP">
                    {s.xp.toLocaleString()}
                  </span>
                  <span className="fac-num fac-muted" data-k="Streak">
                    {s.streak > 0 ? `${s.streak}d` : "·"}
                  </span>
                  <span className="fac-num fac-muted" data-k="Finals">
                    {s.finals > 0 ? s.finals : "·"}
                  </span>
                  <span className="fac-num fac-muted" data-k="Field Work">
                    {s.fieldwork > 0 ? s.fieldwork : "·"}
                  </span>
                  <span className="fac-dimmer" data-k="Last seen" style={{ fontSize: 12.5 }}>
                    {s.lastActive ? ago(s.lastActive) : "never"}
                  </span>
                </div>

                <div className="fac-matrix" style={{ padding: "0 20px 13px" }}>
                  {data.courses.map((c) => {
                    const done = s.done?.[c.slug] ?? [];
                    return (
                      <span key={c.slug} className="fac-matrix-course" title={c.title}>
                        {c.units.map((u) => (
                          <span
                            key={u.slug}
                            className={`fac-matrix-cell${
                              !u.taught
                                ? " is-untaught"
                                : done.includes(u.slug)
                                  ? ` is-done tone-${c.tone}`
                                  : ""
                            }`}
                            title={`${c.title} · ${u.title}${!u.taught ? " (not written yet)" : ""}`}
                          />
                        ))}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <p className="fac-hint">
        Filled dots are finished units, one strip per course. Hollow dots are units nobody has written
        yet, so an empty stretch at the end of a course is on us, not on them.
      </p>

      {open && <StudentFile email={open} onClose={() => setOpen(null)} onChange={reload} flash={flash} />}
      {flashNode}
    </Room>
  );
}
