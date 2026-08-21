// The diagrams a lesson can ask for by name.
//
// Two rules shaped every one of these. First, the words inside a picture are
// real DOM text, never SVG <text>: a 600-unit viewBox squeezed onto a phone
// turns 15px type into 8px, and this school is read on phones. Shapes are
// SVG, sentences are HTML, and the two are stacked. Second, the whole figure
// is announced as one image with one written sentence, because a screen
// reader walking a scatter of chips learns nothing about a diagram.
//
// Adding a drawing: add its id to LessonArt in lib/lms.ts, add a case here,
// and give the phone app something honest to show in mobile/app/unit.

import type { LessonArt } from "@/lib/lms";

// A shape layer. Never carries meaning on its own, so it stays out of the
// accessibility tree entirely.
function Shapes({ viewBox, children }: { viewBox: string; children: React.ReactNode }) {
  return (
    <svg className="la-shapes" viewBox={viewBox} preserveAspectRatio="none" aria-hidden="true">
      {children}
    </svg>
  );
}

function TwoVoices() {
  return (
    <div className="la la--fork">
      <p className="la-seed">You bomb the presentation.</p>
      <div className="la-fork-neck">
        <Shapes viewBox="0 0 200 40">
          <path
            d="M100 0 V14 M14 14 H186 M14 14 V40 M186 14 V40"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.32"
            strokeWidth="1.5"
          />
        </Shapes>
      </div>
      <div className="la-pair">
        <div className="la-card la-card--warn">
          <p className="la-card-label">The Critic</p>
          <p className="la-card-line">&ldquo;You always do this. Presenting is not your thing.&rdquo;</p>
          <p className="la-card-out">You find a reason to skip the next one.</p>
        </div>
        <div className="la-card la-card--good">
          <p className="la-card-label">The Coach</p>
          <p className="la-card-line">&ldquo;The opening was rushed. Fix that one thing.&rdquo;</p>
          <p className="la-card-out">You book the next one.</p>
        </div>
      </div>
    </div>
  );
}

function CriticCost() {
  const nodes = ["You make a mistake", "“I’m bad at this”", "You avoid it", "You get worse at it"];
  return (
    <div className="la la--loop">
      <ol className="la-loop-ring">
        {nodes.map((n, i) => (
          <li key={i} className="la-loop-node">
            <span className="la-loop-n">{i + 1}</span>
            <span className="la-loop-text">{n}</span>
          </li>
        ))}
      </ol>
      {/* The return leg is borders rather than a path: an arrow drawn in a
          stretched viewBox arrives squashed, and this has to span any width. */}
      <div className="la-loop-return" aria-hidden="true" />
      <p className="la-loop-back">and back to the top, forever, with nothing fixed</p>
    </div>
  );
}

function StartCost() {
  return (
    <div className="la la--plot la--hill">
      <div className="la-plot">
        <Shapes viewBox="0 0 600 200">
          <path
            d="M20 172 L74 172 C92 172 96 26 118 26 C140 26 146 140 172 146 L580 154 L580 176 L20 176 Z"
            fill="currentColor"
            fillOpacity="0.06"
          />
          <path
            d="M20 172 L74 172 C92 172 96 26 118 26 C140 26 146 140 172 146 L580 154"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path d="M20 176 L580 176" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
        </Shapes>
        <span className="la-tag la-tag--warn" style={{ left: "24%", top: "6%" }}>
          Starting
        </span>
        <span className="la-tag la-tag--good" style={{ left: "50%", top: "52%" }}>
          Keeping going
        </span>
      </div>
    </div>
  );
}

function ShrinkIt() {
  const bars = [
    { w: "100%", label: "Study for two hours", note: "Dead by Thursday", tone: "warn" },
    { w: "46%", label: "Study for twenty minutes", note: "Dead by the bad week", tone: "warn" },
    { w: "14%", label: "Open the notebook", note: "Still alive in March", tone: "good" },
  ];
  return (
    <div className="la la--bars">
      {bars.map((b) => (
        <div key={b.label} className={`la-bar-row la-bar-row--${b.tone}`}>
          <span className="la-bar" style={{ width: b.w }} />
          <span className="la-bar-label">{b.label}</span>
          <span className="la-bar-note">{b.note}</span>
        </div>
      ))}
    </div>
  );
}

function NeverMissTwice() {
  return (
    <div className="la la--streak">
      <div className="la-streak-run">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="la-day is-hit" />
        ))}
        <span className="la-day is-miss" />
        <span className="la-streak-caption">One day missed. Nothing has happened yet.</span>
      </div>
      <div className="la-branches">
        <div className="la-branch la-branch--bad">
          <div className="la-branch-days">
            <span className="la-day is-miss" />
            <span className="la-day is-miss" />
            <span className="la-day is-dead" />
          </div>
          <p className="la-branch-text">Miss the next one and you are not recovering, you are quitting slowly.</p>
        </div>
        <div className="la-branch la-branch--good">
          <div className="la-branch-days">
            <span className="la-day is-hit" />
            <span className="la-day is-hit" />
            <span className="la-day is-hit" />
          </div>
          <p className="la-branch-text">Land the next one and the miss stays a bad day instead of the end.</p>
        </div>
      </div>
    </div>
  );
}

function TheLongMiddle() {
  return (
    <div className="la la--plot la--curve">
      <div className="la-plot">
        <Shapes viewBox="0 0 600 200">
          <rect x="150" y="0" width="290" height="176" className="la-band" />
          <path d="M20 176 L580 176" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
          <path
            d="M30 26 C70 76 96 108 148 118 L432 128 C494 133 540 152 572 160"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </Shapes>
        {/* The shape layer is stretched to the frame, which would turn a
            circle into an oval, so the two markers are HTML sitting at the
            same coordinates the viewBox uses. */}
        <span className="la-point la-point--warn" style={{ left: "48.3%", top: "63%" }} />
        <span className="la-point la-point--good" style={{ left: "95.3%", top: "80.5%" }} />
        <span className="la-tag la-tag--plain" style={{ left: "3%", top: "2%" }}>
          How hard it feels
        </span>
        <span className="la-tag la-tag--warn" style={{ left: "32%", top: "34%" }}>
          Most people quit in here
        </span>
        <span className="la-tag la-tag--good" style={{ right: "2%", top: "50%" }}>
          Automatic
        </span>
      </div>
      <div className="la-axis">
        <span>Day 1</span>
        <span>Day 66</span>
      </div>
    </div>
  );
}

const ART: Record<LessonArt, () => React.ReactElement> = {
  "two-voices": TwoVoices,
  "critic-cost": CriticCost,
  "start-cost": StartCost,
  "shrink-it": ShrinkIt,
  "never-miss-twice": NeverMissTwice,
  "the-long-middle": TheLongMiddle,
};

export default function LessonArtFigure({
  art,
  alt,
  caption,
}: {
  art: LessonArt;
  alt: string;
  caption?: string;
}) {
  const Drawing = ART[art];
  if (!Drawing) return null;
  return (
    <figure className="lms-art">
      {/* One image, one sentence. The chips inside are layout, not reading
          order, so they are announced as the alt line instead. */}
      <div className="lms-art-frame" role="img" aria-label={alt}>
        <Drawing />
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
