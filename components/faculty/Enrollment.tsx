"use client";

// Enrollment: what the school sells, if it sells anything.
//
// The school is free today. This room exists so that turning that around
// is an afternoon's work and not a rebuild: build the plans, see exactly
// who would be locked out, then flip one switch in School Ops.
//
// There is no payment provider wired up, and this page says so plainly
// rather than pretending. Access is granted by a person until there is.

import { useState } from "react";
import {
  accessGrant,
  accessRevoke,
  planDrop,
  planPrice,
  planSave,
  planSet,
  schoolAdmin,
  type Plan,
  type SchoolAdmin,
} from "@/lib/faculty";
import { Empty, Panel, Room, Skeleton, Tag, useFacultyData, useFlash } from "./ui";

const BLANK: Partial<Plan> = {
  id: "",
  name: "",
  blurb: "",
  price: 0,
  cadence: "once",
  courses: [],
  active: true,
};

export default function Enrollment() {
  const { data, error, reload, token } = useFacultyData<SchoolAdmin>(schoolAdmin);
  const { flash, node: flashNode } = useFlash();
  const [draft, setDraft] = useState<Partial<Plan> | null>(null);

  if (error) {
    return (
      <Room kicker="Faculty Lounge" title="Enrollment">
        <Empty title="Could not open enrollment.">{error}</Empty>
      </Room>
    );
  }

  if (!data) {
    return (
      <Room kicker="Faculty Lounge" title="Enrollment">
        <Skeleton rows={6} />
      </Room>
    );
  }

  const paid = data.features.paid;

  const save = async () => {
    if (!draft) return;
    const r = await planSave(token, draft);
    if (r.ok) {
      setDraft(null);
      reload();
      flash("Plan saved.");
    } else {
      flash((r.data.error as string) ?? "Could not save that plan.");
    }
  };

  return (
    <Room
      kicker="Faculty Lounge"
      title="Enrollment"
      sub={
        paid
          ? "Payment is on. A student can only open a course their plan covers, or one the front office handed them."
          : "The school is free and open. Nothing here has any effect until payment is switched on in School Ops."
      }
      actions={
        !draft && (
          <button className="fac-btn fac-btn--go" onClick={() => setDraft({ ...BLANK })}>
            Add a Plan
          </button>
        )
      }
    >
      {!paid && (
        <Panel title="Everything below is a rehearsal">
          <p className="fac-panel-sub">
            While payment is off, every signed-in student can open every course, whatever the plans say.
            Build what you want here, check the table at the bottom to see exactly who would be locked out,
            and only then throw the switch. It is one toggle, and it is reversible.
          </p>
        </Panel>
      )}

      {draft && (
        <Panel title={draft.id ? "Edit the plan" : "New plan"}>
          <div className="fac-row">
            <label className="fac-field">
              <span className="fac-label">Name</span>
              <input
                className="fac-input"
                maxLength={40}
                placeholder="The Money Year"
                value={draft.name ?? ""}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label className="fac-field">
              <span className="fac-label">Price in dollars</span>
              <input
                className="fac-input"
                type="number"
                min={0}
                step="1"
                value={(draft.price ?? 0) / 100}
                onChange={(e) => setDraft({ ...draft, price: Math.round(Number(e.target.value) * 100) })}
              />
            </label>
            <label className="fac-field">
              <span className="fac-label">Billed</span>
              <select
                className="fac-select"
                value={draft.cadence ?? "once"}
                onChange={(e) => setDraft({ ...draft, cadence: e.target.value as Plan["cadence"] })}
              >
                <option value="once">Once</option>
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
            </label>
          </div>

          <label className="fac-field">
            <span className="fac-label">One line about it</span>
            <input
              className="fac-input"
              maxLength={200}
              placeholder="The 14th Grade, start to finish."
              value={draft.blurb ?? ""}
              onChange={(e) => setDraft({ ...draft, blurb: e.target.value })}
            />
          </label>

          <span className="fac-label">What it opens</span>
          <div className="fac-head-actions" style={{ marginBottom: 14 }}>
            <button
              className={`fac-btn fac-btn--sm${draft.courses?.includes("*") ? " fac-btn--go" : ""}`}
              onClick={() => setDraft({ ...draft, courses: ["*"] })}
            >
              Everything
            </button>
            {data.courses.map((c) => {
              const on = draft.courses?.includes(c.slug);
              return (
                <button
                  key={c.slug}
                  className={`fac-btn fac-btn--sm${on ? " fac-btn--go" : ""}`}
                  onClick={() => {
                    const without = (draft.courses ?? []).filter((s) => s !== "*" && s !== c.slug);
                    setDraft({ ...draft, courses: on ? without : [...without, c.slug] });
                  }}
                >
                  {c.title}
                </button>
              );
            })}
          </div>

          <div className="fac-item-actions">
            <button
              className="fac-btn fac-btn--go"
              disabled={!draft.name?.trim() || (draft.courses ?? []).length === 0}
              onClick={() => void save()}
            >
              Save the Plan
            </button>
            <button className="fac-btn fac-btn--quiet" onClick={() => setDraft(null)}>
              Cancel
            </button>
            <label className="fac-hint" style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <input
                type="checkbox"
                checked={draft.active !== false}
                onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
              />
              Selling now
            </label>
          </div>
        </Panel>
      )}

      <Panel title="Plans" count={data.plans.length} countTone="quiet" flush>
        {data.plans.length === 0 ? (
          <Empty title="No plans." />
        ) : (
          <div style={{ padding: "4px 20px" }}>
            {data.plans.map((p) => (
              <div key={p.id} className="fac-plan">
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "15px" }}>
                    {p.name}{" "}
                    {!p.active && <Tag>Not selling</Tag>}
                    {data.defaultPlan === p.id && <Tag tone="vio">Default for new accounts</Tag>}
                  </p>
                  <p className="fac-panel-sub" style={{ marginTop: 4 }}>
                    {p.blurb}
                  </p>
                  <p className="fac-hint" style={{ marginTop: 6 }}>
                    Opens:{" "}
                    {p.courses.includes("*")
                      ? "every course"
                      : p.courses.map((s) => data.courses.find((c) => c.slug === s)?.title ?? s).join(", ")}
                  </p>
                </div>
                <div style={{ textAlign: "right", flex: "none" }}>
                  <p className="fac-plan-price">{planPrice(p)}</p>
                  <div className="fac-item-actions" style={{ justifyContent: "flex-end" }}>
                    <button className="fac-btn fac-btn--sm fac-btn--quiet" onClick={() => setDraft({ ...p })}>
                      Edit
                    </button>
                    <button
                      className="fac-btn fac-btn--sm fac-btn--quiet fac-btn--danger"
                      onClick={async () => {
                        const r = await planDrop(token, p.id);
                        if (r.ok) {
                          reload();
                          flash("Plan retired.");
                        } else {
                          flash((r.data.error as string) ?? "Could not retire that plan.");
                        }
                      }}
                    >
                      Retire
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel
        title="Who is on what"
        sub={
          paid
            ? "A locked course is one this student cannot open right now."
            : "This is what the school would look like the moment payment is switched on."
        }
        flush
      >
        {data.roll.length === 0 ? (
          <Empty title="No students yet." />
        ) : (
          <div className="fac-table">
            <div
              className="fac-tr fac-tr--head"
              style={{ gridTemplateColumns: `minmax(0,1.2fr) 170px repeat(${data.courses.length}, minmax(0,1fr))` }}
            >
              <span>Student</span>
              <span>Plan</span>
              {data.courses.map((c) => (
                <span key={c.slug}>{c.title.replace("The ", "")}</span>
              ))}
            </div>
            {data.roll.map((p) => (
              <div
                key={p.email}
                className="fac-tr"
                style={{ gridTemplateColumns: `minmax(0,1.2fr) 170px repeat(${data.courses.length}, minmax(0,1fr))` }}
              >
                <span style={{ fontWeight: 700 }}>{p.name}</span>
                <span data-k="Plan">
                  <select
                    className="fac-select"
                    value={p.plan}
                    aria-label={`Plan for ${p.email}`}
                    onChange={async (e) => {
                      const r = await planSet(token, p.email, e.target.value);
                      if (r.ok) {
                        reload();
                        flash("Plan changed.");
                      } else {
                        flash((r.data.error as string) ?? "Could not change that.");
                      }
                    }}
                  >
                    <option value="">No plan</option>
                    {data.plans.map((pl) => (
                      <option key={pl.id} value={pl.id}>
                        {pl.name}
                      </option>
                    ))}
                  </select>
                </span>
                {data.courses.map((c) => {
                  const open = p.access[c.slug];
                  const granted = p.grants.includes(c.slug);
                  return (
                    <span key={c.slug} data-k={c.title}>
                      <button
                        className="fac-btn fac-btn--sm fac-btn--quiet"
                        title={
                          granted
                            ? "Handed to them by the front office. Click to take it back."
                            : open
                              ? "Open through their plan."
                              : "Locked. Click to hand it to them anyway."
                        }
                        onClick={async () => {
                          const r = granted
                            ? await accessRevoke(token, p.email, c.slug)
                            : await accessGrant(token, p.email, c.slug);
                          if (r.ok) {
                            reload();
                            flash(granted ? "Access taken back." : `${p.name} can open ${c.title}.`);
                          }
                        }}
                      >
                        {granted ? (
                          <Tag tone="vio">Granted</Tag>
                        ) : open ? (
                          <Tag tone="acc">Open</Tag>
                        ) : (
                          <Tag tone="coral">Locked</Tag>
                        )}
                      </button>
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </Panel>

      <p className="fac-hint">
        There is no payment provider connected. Nothing on this page charges anybody: a plan is a label,
        and access is something a person hands over. Wiring a checkout in later means filling in one
        endpoint, because the gate every course already goes through is a single function on the server.
      </p>

      {flashNode}
    </Room>
  );
}
