// The Slammer: the hallway locker that guards the whole course. Classic
// middle school locker in dark yellow peach, three louvered vents up top,
// three down low, and the black lever that opens it sitting under the top
// vents. Same flat-sticker style as MonsterArt.
//
// Three states, driven by the fight:
//   dents  - one dent per CORRECT answer, drawn in a fixed order so the
//            door visibly crumples as the player lands hits. Never drawn
//            for a wrong answer; wrong answers are the slam.
//   slam   - the door swings open at the player (its attack).
//   beaten - the door hangs off its hinge and the papers spill out.

const INK = "#14141a";
const BODY = "#E2A05C"; // dark yellow peach
const BODY_DARK = "#C8863E"; // the door's backside and shadow edges
const SHADE = "#7C5833";
const CREAM = "#F2EEE3";

// Dent spots on the door face, in the order they land. Eight is the cap;
// the fight can dent past that but the door is out of clean panel by then.
const DENT_SPOTS: [number, number][] = [
  [60, 84],
  [80, 88],
  [55, 66],
  [70, 122],
  [86, 30],
  [53, 30],
  [66, 94],
  [86, 70],
];

function Dent({ cx, cy, i }: { cx: number; cy: number; i: number }) {
  // Crumple strokes with a soft bruise under them; each spot rotates a
  // little differently so the damage reads hand-made, not stamped.
  const angle = ((i * 47) % 40) - 20;
  return (
    <g transform={`rotate(${angle} ${cx} ${cy})`}>
      <ellipse cx={cx} cy={cy} rx={9} ry={6} fill={INK} opacity="0.12" />
      <g stroke={SHADE} strokeWidth="2.4" strokeLinecap="round" fill="none">
        <path d={`M${cx - 7} ${cy - 3} L${cx - 2} ${cy + 1} L${cx - 6} ${cy + 5}`} />
        <path d={`M${cx + 2} ${cy - 6} L${cx + 5} ${cy - 1} L${cx + 1} ${cy + 3}`} />
      </g>
    </g>
  );
}

function Vents({ y }: { y: number }) {
  return (
    <g fill={INK} opacity="0.85">
      <rect x="56" y={y} width="28" height="3.6" rx="1.8" />
      <rect x="56" y={y + 7} width="28" height="3.6" rx="1.8" />
      <rect x="56" y={y + 14} width="28" height="3.6" rx="1.8" />
    </g>
  );
}

export default function LockerBossArt({
  size = 140,
  dents = 0,
  slam = false,
  beaten = false,
}: {
  size?: number;
  dents?: number;
  slam?: boolean;
  beaten?: boolean;
}) {
  const open = slam || beaten;
  const shown = Math.min(beaten ? DENT_SPOTS.length : dents, DENT_SPOTS.length);

  return (
    <svg viewBox="0 0 140 140" width={size} height={size} role="img" aria-label="The Slammer">
      {/* Cabinet */}
      <rect x="42" y="8" width="56" height="124" rx="5" fill={BODY} stroke={INK} strokeWidth="3" />
      <path d="M94 12 V128" stroke={BODY_DARK} strokeWidth="4" strokeLinecap="round" opacity="0.6" />

      {!open && (
        <g>
          {/* Door seam, number plate, vents above and below, lever between */}
          <rect x="47" y="13" width="46" height="114" rx="3" fill="none" stroke={SHADE} strokeWidth="2" opacity="0.55" />
          <rect x="62" y="17" width="16" height="9" rx="2" fill={SHADE} />
          <text x="70" y="24.4" textAnchor="middle" fontSize="7.5" fontWeight="800" fill={CREAM} fontFamily="sans-serif">
            13
          </text>
          <Vents y={34} />
          {/* The lever: black, right under the top venting, on a recessed plate */}
          <rect x="70" y="58" width="17" height="18" rx="2.5" fill={SHADE} opacity="0.4" />
          <rect x="78" y="56" width="7" height="21" rx="3.5" fill="#111114" stroke={INK} strokeWidth="1.5" />
          <Vents y={98} />
          {DENT_SPOTS.slice(0, shown).map(([cx, cy], i) => (
            <Dent key={i} cx={cx} cy={cy} i={i} />
          ))}
          {/* Past the art cap the whole door creases */}
          {shown >= DENT_SPOTS.length - 2 && (
            <path d="M49 80 L72 76 L91 82" stroke={SHADE} strokeWidth="2.6" strokeLinecap="round" fill="none" />
          )}
        </g>
      )}

      {open && (
        <g>
          {/* Inside: shelf, hook, and the textbook it took from somebody */}
          <rect x="47" y="13" width="46" height="114" rx="3" fill="#221A12" />
          <path d="M48 46 H92" stroke="#3A2D1E" strokeWidth="3" />
          <rect x="58" y="37" width="19" height="7" rx="1.5" fill="#5B7CFA" />
          <path d="M70 58 v8 M70 66 q4 4 7 1" stroke="#3A2D1E" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
      )}

      {slam && !beaten && (
        <g>
          {/* Door swung hard at the player (the player stands to the left) */}
          <polygon points="47,13 12,24 12,118 47,127" fill={BODY_DARK} stroke={INK} strokeWidth="3" />
          <g stroke={INK} strokeWidth="3" strokeLinecap="round" opacity="0.85">
            <path d="M20 36 L40 30" />
            <path d="M20 43 L40 37" />
            <path d="M20 50 L40 44" />
          </g>
          <rect x="14" y="62" width="6" height="18" rx="3" fill="#111114" />
          {/* Whoosh */}
          <g stroke={INK} strokeWidth="2.5" strokeLinecap="round" opacity="0.55" fill="none">
            <path d="M52 30 Q60 32 62 40" />
            <path d="M54 104 Q62 102 64 94" />
          </g>
        </g>
      )}

      {beaten && (
        <g>
          {/* Door hanging off the hinge, lever bent, homework finally free */}
          <polygon points="47,13 20,34 24,124 47,127" fill={BODY_DARK} stroke={INK} strokeWidth="3" />
          <path d="M24 60 L40 55 M26 90 L42 88" stroke={SHADE} strokeWidth="2.6" strokeLinecap="round" />
          <rect x="26" y="66" width="6" height="16" rx="3" fill="#111114" transform="rotate(24 29 74)" />
          {DENT_SPOTS.slice(0, 5).map(([cx, cy], i) => (
            <Dent key={i} cx={cx - 20} cy={Math.min(122, cy + 6)} i={i} />
          ))}
          <circle cx="36" cy="126" r="5" fill={CREAM} stroke={SHADE} strokeWidth="1.5" />
          <rect x="52" y="128" width="13" height="8" rx="1" fill={CREAM} stroke={SHADE} strokeWidth="1.5" transform="rotate(-9 58 132)" />
          <circle cx="70" cy="132" r="4" fill={CREAM} stroke={SHADE} strokeWidth="1.5" />
        </g>
      )}
    </svg>
  );
}
