// The generic graphics a lesson can fill with its own content.
//
// LessonArt.tsx holds drawings that are specific to one unit. These are the
// opposite: six shapes any unit can pour numbers into, which is what makes it
// possible for thirty lessons to be illustrated without thirty bespoke SVGs.
//
// The rules are the same as the drawings. Every word is DOM text, so nothing
// is 8px on a phone. Nothing relies on colour alone: tone always arrives
// alongside a label or a position. And a graphic is a figure with a caption,
// never a floating decoration.

import type { LessonBlock, Tone } from "@/lib/lms";

function toneClass(tone?: Tone): string {
  return tone && tone !== "plain" ? ` is-${tone}` : "";
}

function Figure({
  className,
  title,
  caption,
  children,
}: {
  className: string;
  title?: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className={`lms-gfx ${className}`}>
      {title && <p className="lms-gfx-title">{title}</p>}
      <div className="lms-gfx-body">{children}</div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

function Bars({ block }: { block: Extract<LessonBlock, { kind: "bars" }> }) {
  // Scale off the largest value so the author writes real numbers and never a
  // percentage. A zero-width bar would read as a missing row, hence the floor.
  const max = Math.max(...block.items.map((i) => Math.abs(i.value)), 1);
  return (
    <Figure className="gfx-bars" title={block.title} caption={block.caption}>
      {block.items.map((item, i) => (
        <div key={i} className={`gfx-bar-row${toneClass(item.tone)}`}>
          <div className="gfx-bar-head">
            <span className="gfx-bar-label">{item.label}</span>
            <span className="gfx-bar-value">{item.display ?? item.value.toLocaleString("en-US")}</span>
          </div>
          <span className="gfx-bar-track">
            <span className="gfx-bar-fill" style={{ width: `${Math.max(2, (Math.abs(item.value) / max) * 100)}%` }} />
          </span>
          {item.note && <span className="gfx-bar-note">{item.note}</span>}
        </div>
      ))}
    </Figure>
  );
}

function Flow({ block }: { block: Extract<LessonBlock, { kind: "flow" }> }) {
  return (
    <Figure
      className={`gfx-flow${block.loop ? " is-loop" : ""}${toneClass(block.tone)}`}
      title={block.title}
      caption={block.caption}
    >
      <ol className="gfx-flow-list">
        {block.steps.map((step, i) => (
          <li key={i} className="gfx-flow-step">
            <span className="gfx-flow-n">{i + 1}</span>
            <span className="gfx-flow-text">
              <span className="gfx-flow-label">{step.label}</span>
              {step.note && <span className="gfx-flow-note">{step.note}</span>}
            </span>
          </li>
        ))}
      </ol>
      {block.loop && (
        <>
          {/* Borders rather than an arrow in a stretched viewBox, which
              arrives squashed at any width the frame is not. */}
          <div className="gfx-flow-return" aria-hidden="true" />
          <p className="gfx-flow-back">and round again</p>
        </>
      )}
    </Figure>
  );
}

function Timeline({ block }: { block: Extract<LessonBlock, { kind: "timeline" }> }) {
  return (
    <Figure className="gfx-timeline" title={block.title} caption={block.caption}>
      <ol className="gfx-tl-list">
        {block.points.map((pt, i) => (
          <li key={i} className={`gfx-tl-point${toneClass(pt.tone)}`}>
            <span className="gfx-tl-at">{pt.at}</span>
            <span className="gfx-tl-dot" aria-hidden="true" />
            <span className="gfx-tl-body">
              <span className="gfx-tl-label">{pt.label}</span>
              {pt.note && <span className="gfx-tl-note">{pt.note}</span>}
            </span>
          </li>
        ))}
      </ol>
    </Figure>
  );
}

function Receipt({ block }: { block: Extract<LessonBlock, { kind: "receipt" }> }) {
  return (
    <Figure className="gfx-receipt" title={block.title} caption={block.caption}>
      <dl className="gfx-rc-list">
        {block.lines.map((line, i) => (
          <div key={i} className={`gfx-rc-line${toneClass(line.tone)}`}>
            <dt className="gfx-rc-label">
              {line.label}
              {line.note && <span className="gfx-rc-note">{line.note}</span>}
            </dt>
            <dd className="gfx-rc-value">{line.value}</dd>
          </div>
        ))}
      </dl>
      {block.total && (
        <div className="gfx-rc-total">
          <span className="gfx-rc-total-label">{block.total.label}</span>
          <span className="gfx-rc-total-value">{block.total.value}</span>
        </div>
      )}
    </Figure>
  );
}

function Scale({ block }: { block: Extract<LessonBlock, { kind: "scale" }> }) {
  return (
    <Figure className="gfx-scale" title={block.title} caption={block.caption}>
      <div className="gfx-sc-poles">
        <span>{block.left}</span>
        <span>{block.right}</span>
      </div>
      <div className="gfx-sc-track">
        {block.marks.map((mark, i) => (
          <span
            key={i}
            className={`gfx-sc-mark${toneClass(mark.tone)}`}
            style={{ left: `${Math.min(100, Math.max(0, mark.at))}%` }}
          />
        ))}
      </div>
      {/* The marks are dots on a line, so their names are listed underneath
          rather than crammed onto the track where they would collide. */}
      <ul className="gfx-sc-keys">
        {block.marks.map((mark, i) => (
          <li key={i} className={`gfx-sc-key${toneClass(mark.tone)}`}>
            {mark.label}
          </li>
        ))}
      </ul>
    </Figure>
  );
}

function Table({ block }: { block: Extract<LessonBlock, { kind: "table" }> }) {
  return (
    <Figure className="gfx-table" title={block.title} caption={block.caption}>
      {/* Scrolls inside itself. A wide table must never push the page
          sideways, and on a phone three columns will not fit. */}
      <div className="gfx-tb-scroll">
        <table>
          <thead>
            <tr>
              {block.head.map((h, i) => (
                <th key={i} scope={i === 0 ? undefined : "col"}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) =>
                  j === 0 ? (
                    <th key={j} scope="row">
                      {cell}
                    </th>
                  ) : (
                    <td key={j}>{cell}</td>
                  )
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Figure>
  );
}

export default function LessonGraphic({ block }: { block: LessonBlock }) {
  switch (block.kind) {
    case "bars":
      return <Bars block={block} />;
    case "flow":
      return <Flow block={block} />;
    case "timeline":
      return <Timeline block={block} />;
    case "receipt":
      return <Receipt block={block} />;
    case "scale":
      return <Scale block={block} />;
    case "table":
      return <Table block={block} />;
    default:
      return null;
  }
}
