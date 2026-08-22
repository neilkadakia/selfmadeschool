type Props = { gid: string; /** Draw the rule as a scroll indicator. */ progress?: boolean };

// The logotype. Colour lives in CSS rather than inline styles so the bar can
// invert it over the cream, amber and green sections: an inline style cannot
// be overridden by a rule, and this mark has to work on both grounds.
//
// With `progress`, the hand-drawn rule underneath doubles as the page's scroll
// position: a short amber tick at the top, sweeping to its full amber-to-green
// length by the time the reader reaches Enroll, which is green. It is a
// teacher underlining as you get through the material. The nav writes the
// fraction to --wm-progress; nothing animates on its own, so it moves only
// when the reader does, the same contract the hero's cursor glow keeps.
// pathLength={1} normalises the curve so the dash maths in CSS is a fraction.
export default function Wordmark({ gid, progress = false }: Props) {
  return (
    <span className="wm">
      SELF
      <span className="wm-dash">-</span>
      MADE <span className="wm-accent">SCHOOL</span>
      <svg
        className={progress ? "wm-rule wm-rule--progress" : "wm-rule"}
        width="100%"
        height="5"
        viewBox="0 0 300 20"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#F5A83C" />
            <stop offset="0.55" stopColor="#B8C94F" />
            <stop offset="1" stopColor="#43DE7B" />
          </linearGradient>
        </defs>
        <path
          d="M6,15 C90,4 230,4 294,11"
          stroke={"url(#" + gid + ")"}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          pathLength={1}
        />
      </svg>
    </span>
  );
}
