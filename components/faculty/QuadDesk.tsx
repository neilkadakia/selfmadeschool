"use client";

// The Quad, from the staff side: everything a student has asked somebody to
// look at. Reporting is the only way a post reaches this room, so an empty
// room is the good outcome, not a broken one.

import { Room, Panel, Empty, Skeleton, useFacultyData, useFlash } from "@/components/faculty/ui";
import { usDate } from "@/lib/format";
import { quadReported, quadAct, POST_KIND_LABEL, type QuadPost } from "@/lib/quad";

type Data = { posts: QuadPost[] };

export default function QuadDesk() {
  const { data, error, reload, token } = useFacultyData<Data>(quadReported);
  const { flash, node } = useFlash();

  const act = async (action: Parameters<typeof quadAct>[1], id: string, said: string) => {
    const r = await quadAct(token, action, id);
    if (r.ok) {
      flash(said);
      reload();
    } else {
      flash((r.data.error as string) ?? "That did not go through.");
    }
  };

  const posts = data?.posts ?? [];

  return (
    <Room
      kicker="The Quad"
      title="Reported"
      sub="Posts a student has asked somebody to look at. Clearing a report leaves the post up and says it was read; taking it down is on the record."
    >
      {node}
      {error && <Empty title="Could not load that.">{error}</Empty>}
      {!data && !error && <Skeleton rows={3} />}

      {data && posts.length === 0 && (
        <Empty title="Nothing reported.">
          {" "}
          Nobody has flagged anything in the Quad. This room stays empty until they do.
        </Empty>
      )}

      {posts.map((p) => (
        <Panel key={p.id} title={p.clubName || p.club} sub={`${POST_KIND_LABEL[p.kind]} · ${usDate(p.created)}`}>
          <p className="fac-quad-who">
            {p.name}
            {p.email ? ` · ${p.email}` : ""}
          </p>
          <p className="fac-quad-text">{p.text}</p>
          <p className="fac-quad-count">
            {p.reports} {p.reports === 1 ? "report" : "reports"}
            {p.locked ? " · closed" : ""}
            {p.pinned ? " · pinned" : ""}
          </p>
          <div className="fac-quad-acts">
            <button className="btn btn--outline" onClick={() => void act("clear-reports", p.id, "Report cleared.")}>
              Leave It Up
            </button>
            <button
              className="btn btn--outline"
              onClick={() => void act(p.locked ? "unlock" : "lock", p.id, p.locked ? "Thread reopened." : "Thread closed.")}
            >
              {p.locked ? "Reopen Thread" : "Close Thread"}
            </button>
            <button className="btn btn--outline" onClick={() => void act("delete", p.id, "Post taken down.")}>
              Take It Down
            </button>
          </div>
        </Panel>
      ))}
    </Room>
  );
}
