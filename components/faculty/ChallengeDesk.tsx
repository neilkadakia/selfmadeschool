"use client";

// Challenges, staff side: set one, watch who is in it, close it down.
//
// The metric list comes from the server, so a challenge can never be set
// against something the school cannot actually measure.

import { useState, type FormEvent } from "react";
import { Room, Panel, Empty, Skeleton, useFacultyData, useFlash } from "@/components/faculty/ui";
import { usDate } from "@/lib/format";
import {
  challengeList,
  challengeCreate,
  challengeDelete,
  type Challenge,
  type ChallengeMetric,
  type MetricSpec,
} from "@/lib/challenges";

type Data = { challenges: Challenge[]; metrics: Record<string, MetricSpec> };

export default function ChallengeDesk() {
  const { data, error, reload, token } = useFacultyData<Data>(challengeList);
  const { flash, node } = useFlash();

  const [name, setName] = useState("");
  const [blurb, setBlurb] = useState("");
  const [metric, setMetric] = useState<ChallengeMetric>("units");
  const [target, setTarget] = useState("6");
  const [endsAt, setEndsAt] = useState("");
  const [busy, setBusy] = useState(false);

  const metrics = data?.metrics ?? {};

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    // <input type="date"> gives a day; a challenge closes at the end of it.
    const ends = endsAt ? `${endsAt}T23:59:59+00:00` : "";
    const r = await challengeCreate(token, {
      name: name.trim(),
      blurb: blurb.trim(),
      metric,
      target: Number(target) || 0,
      startsAt: "",
      endsAt: ends,
    });
    setBusy(false);
    if (r.ok) {
      setName("");
      setBlurb("");
      setEndsAt("");
      flash("Challenge set.");
      reload();
    } else {
      flash((r.data.error as string) ?? "Could not set that.");
    }
  };

  const remove = async (id: string, label: string) => {
    const r = await challengeDelete(token, id);
    if (r.ok) {
      flash(`Took down ${label}.`);
      reload();
    }
  };

  const rows = data?.challenges ?? [];

  return (
    <Room
      kicker="The Quad"
      title="Challenges"
      sub="A deadline with a number on it. Progress is measured from where each student stood when they joined, so nobody gets credit for work they did last month."
    >
      {node}
      {error && <Empty title="Could not load that.">{error}</Empty>}
      {!data && !error && <Skeleton rows={3} />}

      {data && (
        <Panel title="Set one" sub="Students join it themselves; there is nothing for them to log.">
          <form className="fac-ch-form" onSubmit={create}>
            <label className="fac-field">
              <span>Name</span>
              <input
                className="lms-input"
                maxLength={70}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="The Five-Day Reset"
              />
            </label>
            <label className="fac-field">
              <span>What it is</span>
              <input
                className="lms-input"
                maxLength={240}
                value={blurb}
                onChange={(e) => setBlurb(e.target.value)}
                placeholder="Six units before Sunday. Read first, watch second."
              />
            </label>
            <div className="fac-ch-row">
              <label className="fac-field">
                <span>Measured in</span>
                <select
                  className="lms-input"
                  value={metric}
                  onChange={(e) => setMetric(e.target.value as ChallengeMetric)}
                >
                  {Object.entries(metrics).map(([id, m]) => (
                    <option key={id} value={id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="fac-field">
                <span>Target</span>
                <input
                  className="lms-input"
                  type="number"
                  min={1}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
              </label>
              <label className="fac-field">
                <span>Closes</span>
                <input
                  className="lms-input"
                  type="date"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
              </label>
            </div>
            <button className="btn btn--outline" type="submit" disabled={busy}>
              {busy ? "Setting…" : "Set the Challenge"}
            </button>
          </form>
        </Panel>
      )}

      {data && rows.length === 0 && (
        <Empty title="Nothing running.">
          {" "}
          Set one above and it shows up for every student straight away.
        </Empty>
      )}

      {rows.map((c) => (
        <Panel
          key={c.id}
          title={c.name}
          sub={`${c.target} ${c.unit} · ${c.metricName}${c.endsAt ? ` · closes ${usDate(c.endsAt)}` : ""}${
            c.open ? "" : " · closed"
          }`}
          actions={
            <button className="btn btn--outline" onClick={() => void remove(c.id, c.name)}>
              Take It Down
            </button>
          }
        >
          {c.blurb && <p className="fac-quad-text">{c.blurb}</p>}
          <p className="fac-quad-count">
            {c.members} {c.members === 1 ? "person" : "people"} in · {c.finished} finished
          </p>
          {c.finishers.length > 0 && <p className="fac-quad-who">{c.finishers.join(" · ")}</p>}
        </Panel>
      ))}
    </Room>
  );
}
