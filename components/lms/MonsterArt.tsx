// Boss art for the Arena — four flat-sticker beasts, tinted per boss.

import type { Monster } from "@/lib/game";

const INK = "#14141a";

function shade(hex: string): string {
  // Quick darken: halve each channel toward ink. Deterministic, no deps.
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * 0.55);
  const g = Math.round(((n >> 8) & 255) * 0.55);
  const b = Math.round((n & 255) * 0.55);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export default function MonsterArt({
  monster,
  size = 140,
  hurt = false,
}: {
  monster: Monster;
  size?: number;
  hurt?: boolean;
}) {
  const c = monster.color;
  const dark = shade(c);
  const eyes = hurt ? (
    <g stroke={INK} strokeWidth="3" strokeLinecap="round">
      <path d="M48 56 L58 66 M58 56 L48 66" />
      <path d="M82 56 L92 66 M92 56 L82 66" />
    </g>
  ) : null;

  return (
    <svg viewBox="0 0 140 140" width={size} height={size} role="img" aria-label={monster.name}>
      {monster.kind === "critic" && (
        <g>
          <path d="M30 120 Q20 60 45 40 Q40 18 55 28 Q62 20 70 28 Q78 20 85 28 Q100 18 95 40 Q120 60 110 120 Z" fill={c} />
          <path d="M30 120 Q40 105 50 120 Q60 105 70 120 Q80 105 90 120 Q100 105 110 120 Z" fill={dark} />
          <path d="M38 52 L60 60 M102 52 L80 60" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          {!hurt && (
            <g fill={INK}>
              <circle cx="53" cy="66" r="5" />
              <circle cx="87" cy="66" r="5" />
            </g>
          )}
          {eyes}
          <path d="M50 88 Q70 80 90 88 L86 96 L80 90 L74 97 L70 90 L66 97 L60 90 L54 96 Z" fill="#fff" stroke={INK} strokeWidth="2" />
        </g>
      )}
      {monster.kind === "kraken" && (
        <g>
          <path d="M35 92 Q28 34 70 30 Q112 34 105 92 Z" fill={c} />
          <path d="M35 92 Q30 122 18 126 Q34 128 42 114 Q44 128 34 136 Q52 132 52 112 Q58 130 70 134 Q66 122 62 108 Q76 126 90 126 Q80 116 78 104 Q92 120 108 114 Q94 108 92 96 Z" fill={dark} />
          {!hurt && (
            <g>
              <circle cx="56" cy="62" r="8" fill="#fff" />
              <circle cx="84" cy="62" r="8" fill="#fff" />
              <circle cx="58" cy="64" r="4" fill={INK} />
              <circle cx="86" cy="64" r="4" fill={INK} />
            </g>
          )}
          {eyes}
          <path d="M60 84 Q70 90 80 84" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
          <g transform="rotate(14 112 78)">
            <rect x="102" y="70" width="26" height="17" rx="3" fill="#e8c95c" />
            <rect x="102" y="74" width="26" height="4" fill={INK} />
            <rect x="105" y="81" width="12" height="3" rx="1.5" fill="#8a6b14" />
          </g>
        </g>
      )}
      {monster.kind === "fog" && (
        <g>
          <circle cx="45" cy="70" r="26" fill={c} />
          <circle cx="75" cy="52" r="30" fill={c} />
          <circle cx="100" cy="76" r="24" fill={c} />
          <circle cx="70" cy="88" r="30" fill={dark} opacity="0.5" />
          {!hurt && (
            <g stroke={INK} strokeWidth="2.6" fill="none">
              <path d="M56 58 Q64 54 64 62 Q64 68 58 66 Q54 64 57 60" />
              <path d="M84 58 Q92 54 92 62 Q92 68 86 66 Q82 64 85 60" />
            </g>
          )}
          {eyes}
          <path d="M62 84 Q70 80 78 84" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
          <g fill={INK} fontFamily="sans-serif" fontWeight="800">
            <text x="20" y="40" fontSize="16">?</text>
            <text x="112" y="46" fontSize="13">?</text>
            <text x="118" y="112" fontSize="15">?</text>
          </g>
        </g>
      )}
      {monster.kind === "poltergeist" && (
        <g>
          <path d="M38 126 Q30 40 70 34 Q110 40 102 126 Q94 116 86 126 Q78 116 70 126 Q62 116 54 126 Q46 116 38 126 Z" fill="#eef0f6" />
          <path d="M46 122 Q40 60 70 52" stroke="#c9cede" strokeWidth="4" fill="none" strokeLinecap="round" />
          {!hurt && (
            <g fill={INK}>
              <ellipse cx="58" cy="66" rx="4.5" ry="7" />
              <ellipse cx="82" cy="66" rx="4.5" ry="7" />
            </g>
          )}
          {eyes}
          <ellipse cx="70" cy="86" rx="6" ry="8" fill={INK} />
          <g transform="rotate(-10 108 96)">
            <rect x="98" y="82" width="24" height="30" rx="2" fill="#fff" stroke={c} strokeWidth="2.5" />
            <text x="110" y="103" textAnchor="middle" fontSize="17" fontWeight="800" fill={c} fontFamily="sans-serif">
              F
            </text>
          </g>
        </g>
      )}
    </svg>
  );
}
