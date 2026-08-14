// Circular progress ring, tone-colored. Pure SVG, no dependencies.

export default function Ring({ pct, tone }: { pct: number; tone: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 64 64" className="lms-ring" aria-hidden="true">
      <circle cx="32" cy="32" r={r} className="lms-ring-track" />
      <circle
        cx="32"
        cy="32"
        r={r}
        className={`lms-ring-fill ring--${tone}`}
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct / 100)}
      />
      <text x="32" y="37" textAnchor="middle" className="lms-ring-text">
        {pct}%
      </text>
    </svg>
  );
}
