// The student portrait: a layered flat-sticker SVG built from the
// avatar config plus whatever gear is equipped. Pure and prop-driven:
// safe anywhere, from the 34px sidebar chip to the Arena. Pass an aura
// tier and the figure visibly powers up: glow, sparks, halo.

import { useId } from "react";
import {
  AURA_TIERS,
  HAIR_COLORS,
  OUTFIT_COLORS,
  SKIN_TONES,
  type AvatarConfig,
  type Equipped,
  type GearSlot,
} from "@/lib/game";

const INK = "#14141a";

// Four-point spark, drawn at the origin. Position with transform.
function Spark({ x, y, s, color, i }: { x: number; y: number; s: number; color: string; i: number }) {
  return (
    <path
      className={`pt-spark pt-spark--${i}`}
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -5 L1.6 -1.6 L5 0 L1.6 1.6 L0 5 L-1.6 1.6 L-5 0 L-1.6 -1.6 Z"
      fill={color}
    />
  );
}

// The power made visible. Tiers stack: glow → sparks → ground ring → halo.
function Aura({ tier, uid }: { tier: number; uid: string }) {
  const color = AURA_TIERS[tier]?.color;
  if (!color || tier < 1) return null;
  return (
    <g className="pt-aura">
      <defs>
        <radialGradient id={`${uid}-aura`} cx="50%" cy="52%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity={0.28 + tier * 0.08} />
          <stop offset="62%" stopColor={color} stopOpacity={0.12 + tier * 0.04} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse className="pt-aura-glow" cx="60" cy="80" rx="56" ry="68" fill={`url(#${uid}-aura)`} />
      {tier >= 2 && (
        <>
          <Spark x={18} y={52} s={1} color={color} i={1} />
          <Spark x={104} y={64} s={0.8} color={color} i={2} />
          <Spark x={26} y={104} s={0.7} color={color} i={3} />
        </>
      )}
      {tier >= 3 && (
        <>
          <ellipse cx="60" cy="138" rx="34" ry="6" fill={color} opacity="0.3" />
          <Spark x={98} y={26} s={1.1} color={color} i={4} />
          <Spark x={12} y={78} s={0.9} color={color} i={5} />
        </>
      )}
      {tier >= 4 && (
        <g className="pt-halo">
          <ellipse cx="60" cy="6" rx="17" ry="4.5" fill="none" stroke={color} strokeWidth="3" opacity="0.9" />
          <g stroke={color} strokeWidth="2.4" strokeLinecap="round" opacity="0.75">
            <line x1="24" y1="10" x2="30" y2="18" />
            <line x1="96" y1="10" x2="90" y2="18" />
          </g>
        </g>
      )}
    </g>
  );
}

function Hair({ style, color }: { style: number; color: string }) {
  switch (style) {
    case 0: // Buzz: tight cap
      return <path d="M38 34 Q38 16 60 16 Q82 16 82 34 L82 36 Q71 26 60 26 Q49 26 38 36 Z" fill={color} />;
    case 1: // Quiff: cap with a front swoop
      return (
        <path
          d="M36 38 Q34 14 62 14 Q84 14 84 36 L84 40 Q80 30 72 28 Q76 22 70 18 Q60 24 46 26 Q38 30 36 38 Z"
          fill={color}
        />
      );
    case 2: // Curls: three bumps
      return (
        <path
          d="M36 38 Q34 26 42 22 Q42 12 54 14 Q60 8 68 14 Q80 12 80 22 Q86 26 84 38 Q78 28 68 28 Q60 24 52 28 Q42 28 36 38 Z"
          fill={color}
        />
      );
    case 3: // Long: falls past the shoulders
      return (
        <path
          d="M34 62 Q30 16 60 14 Q90 16 86 62 L80 62 Q84 34 76 28 Q66 24 54 26 Q40 30 40 44 L40 62 Z M34 62 Q36 66 42 66 L40 50 Z M86 62 Q84 66 78 66 L80 50 Z"
          fill={color}
        />
      );
    case 4: // Topknot
      return (
        <g fill={color}>
          <circle cx="60" cy="12" r="8" />
          <rect x="56" y="16" width="8" height="6" rx="2" />
          <path d="M38 36 Q38 18 60 18 Q82 18 82 36 L82 38 Q70 27 60 27 Q50 27 38 38 Z" />
        </g>
      );
    default: // Clean + beard
      return (
        <path
          d="M40 52 Q40 68 60 68 Q80 68 80 52 L76 52 Q74 60 60 60 Q46 60 44 52 Z"
          fill={color}
        />
      );
  }
}

function Weapon({ id }: { id: string }) {
  switch (id) {
    case "pencil":
      return (
        <g transform="rotate(-8 98 88)">
          <rect x="94" y="52" width="8" height="44" rx="1.5" fill="#f2c94c" />
          <rect x="94" y="92" width="8" height="7" rx="2" fill="#f2a0c0" />
          <path d="M94 52 L98 40 L102 52 Z" fill="#e8d6b0" />
          <path d="M96.6 45 L98 40 L99.4 45 Z" fill={INK} />
        </g>
      );
    case "red-pen":
      return (
        <g transform="rotate(-8 98 88)">
          <rect x="93" y="46" width="10" height="48" rx="4" fill="#d43f33" />
          <path d="M93 46 L98 34 L103 46 Z" fill="#a52c22" />
          <rect x="101" y="56" width="3" height="18" rx="1.5" fill="#7d1f18" />
        </g>
      );
    case "protractor":
      return (
        <g>
          <rect x="95" y="34" width="6" height="64" rx="3" fill="#6b6b78" />
          <path d="M78 34 A20 20 0 0 1 118 34 Z" fill="#cfd6e4" />
          <path d="M84 34 A14 14 0 0 1 112 34 Z" fill="#8fa1c4" />
        </g>
      );
    case "golden-ruler":
      return (
        <g transform="rotate(-6 98 80)">
          <rect x="93" y="30" width="11" height="70" rx="2" fill="#e0b73c" />
          <g stroke="#8a6b14" strokeWidth="1.6">
            <line x1="93" y1="40" x2="98" y2="40" />
            <line x1="93" y1="50" x2="100" y2="50" />
            <line x1="93" y1="60" x2="98" y2="60" />
            <line x1="93" y1="70" x2="100" y2="70" />
            <line x1="93" y1="80" x2="98" y2="80" />
            <line x1="93" y1="90" x2="100" y2="90" />
          </g>
          <path d="M104 26 L106 30 L110 32 L106 34 L104 38 L102 34 L98 32 L102 30 Z" fill="#fff2c4" />
        </g>
      );
    default:
      return null;
  }
}

function Shield({ id }: { id: string }) {
  switch (id) {
    case "binder-shield":
      return (
        <g>
          <rect x="8" y="72" width="28" height="38" rx="6" fill="#3f5ac2" />
          <rect x="8" y="72" width="7" height="38" rx="3.5" fill="#32479c" />
          <circle cx="20" cy="82" r="2.6" fill="#e6e9f5" />
          <circle cx="20" cy="91" r="2.6" fill="#e6e9f5" />
          <circle cx="20" cy="100" r="2.6" fill="#e6e9f5" />
        </g>
      );
    case "hall-pass":
      return (
        <g>
          <path d="M22 66 L22 74" stroke="#c9a13c" strokeWidth="3" />
          <rect x="8" y="74" width="28" height="36" rx="8" fill="#e8c95c" />
          <rect x="12" y="80" width="20" height="7" rx="3.5" fill="#b08a25" />
          <rect x="12" y="92" width="14" height="4" rx="2" fill="#b08a25" />
          <path d="M10 76 L18 74 L12 86 Z" fill="#fff7dd" opacity="0.7" />
        </g>
      );
    default:
      return null;
  }
}

function Armor({ id, body }: { id: string; body: number }) {
  const w = body === 0 ? 48 : 40; // torso overlay width
  const x = 60 - w / 2;
  switch (id) {
    case "cardboard-armor":
      return (
        <g>
          <rect x={x} y="72" width={w} height="34" rx="4" fill="#c29a63" />
          <path d={`M${x} 82 L${x + w} 96 M${x} 96 L${x + w} 82`} stroke="#e9dcc4" strokeWidth="5" />
          <rect x={x} y="87" width={w} height="4" fill="#a87f4c" />
        </g>
      );
    case "varsity-jacket":
      return (
        <g>
          <rect x={x} y="70" width={w} height="38" rx="9" fill="#273a80" />
          <rect x={x} y="70" width="9" height="38" rx="4.5" fill="#e9e4d6" />
          <rect x={x + w - 9} y="70" width="9" height="38" rx="4.5" fill="#e9e4d6" />
          <circle cx="60" cy="86" r="8" fill="#e9e4d6" />
          <text x="60" y="90" textAnchor="middle" fontSize="11" fontWeight="800" fill="#273a80" fontFamily="sans-serif">
            S
          </text>
        </g>
      );
    case "grad-gown":
      return (
        <g>
          <path d={`M${x - 3} 70 L${x + w + 3} 70 L${x + w + 8} 110 L${x - 8} 110 Z`} fill="#22222e" />
          <path d="M52 70 L60 84 L68 70 Z" fill="#3a3a4c" />
          <path d="M55 70 L55 104 M65 70 L65 104" stroke="#e0b73c" strokeWidth="2.4" />
        </g>
      );
    default:
      return null;
  }
}

function Helmet({ id }: { id: string }) {
  switch (id) {
    case "thinking-cap":
      return (
        <g>
          <path d="M36 34 Q36 12 60 12 Q84 12 84 34 L84 38 L36 38 Z" fill="#3f5ac2" />
          <rect x="36" y="34" width="48" height="6" rx="3" fill="#32479c" />
          <path d="M57 6 Q60 -2 63 6 Q66 10 60 12 Q54 10 57 6 Z" fill="#ffe28a" />
          <line x1="60" y1="12" x2="60" y2="15" stroke="#c9a13c" strokeWidth="2" />
        </g>
      );
    case "mortarboard":
      return (
        <g>
          <path d="M36 30 Q36 16 60 14 Q84 16 84 30 L84 33 L36 33 Z" fill="#22222e" />
          <path d="M60 4 L100 16 L60 28 L20 16 Z" fill="#14141a" />
          <path d="M60 4 L100 16 L60 20 Z" fill="#2c2c3a" />
          <line x1="98" y1="17" x2="98" y2="34" stroke="#e0b73c" strokeWidth="2.4" />
          <circle cx="98" cy="37" r="3.4" fill="#e0b73c" />
        </g>
      );
    default:
      return null;
  }
}

// A gear item alone, cropped out of the portrait coordinate space.
// The Locker uses these as shop icons so you can see what you're buying.
const ICON_VIEW: Record<GearSlot, string> = {
  weapon: "74 22 50 82",
  shield: "2 60 44 56",
  armor: "24 58 72 58",
  helmet: "14 -4 92 48",
};

export function GearIcon({ id, slot, size = 44 }: { id: string; slot: GearSlot; size?: number }) {
  return (
    <svg viewBox={ICON_VIEW[slot]} width={size} height={size} aria-hidden="true">
      {slot === "weapon" && <Weapon id={id} />}
      {slot === "shield" && <Shield id={id} />}
      {slot === "armor" && <Armor id={id} body={0} />}
      {slot === "helmet" && <Helmet id={id} />}
    </svg>
  );
}

export default function Portrait({
  avatar,
  equipped = {},
  size = 120,
  aura = 0,
}: {
  avatar: AvatarConfig;
  equipped?: Equipped;
  size?: number;
  aura?: number;
}) {
  const uid = useId();
  const skin = SKIN_TONES[avatar.skin]?.color ?? SKIN_TONES[1].color;
  const hairColor = HAIR_COLORS[avatar.hairColor]?.color ?? HAIR_COLORS[0].color;
  const outfit = OUTFIT_COLORS[avatar.outfit]?.color ?? OUTFIT_COLORS[0].color;
  const broad = avatar.body === 0;
  const torsoW = broad ? 52 : 42;
  const tx = 60 - torsoW / 2;

  return (
    <svg
      viewBox="0 0 120 150"
      width={size}
      height={size * 1.25}
      role="img"
      aria-label="Your student portrait"
    >
      <Aura tier={aura} uid={uid} />

      {/* Legs + shoes */}
      <rect x="47" y="106" width="11" height="30" rx="4" fill="#2c2c38" />
      <rect x="62" y="106" width="11" height="30" rx="4" fill="#2c2c38" />
      <path d="M44 134 L58 134 L58 141 L44 141 Q41 141 41 138 Q41 134 44 134 Z" fill={INK} />
      <path d="M62 134 L76 134 L79 138 Q79 141 76 141 L62 141 Z" fill={INK} />

      {/* Arms (sleeves + hands) */}
      <rect x={tx - 9} y="72" width="12" height="30" rx="6" fill={outfit} />
      <rect x={tx + torsoW - 3} y="72" width="12" height="30" rx="6" fill={outfit} />
      <circle cx={tx - 3} cy="104" r="5.5" fill={skin} />
      <circle cx={tx + torsoW + 3} cy="104" r="5.5" fill={skin} />

      {/* Torso */}
      <path
        d={
          broad
            ? `M${tx} 74 Q${tx} 66 ${tx + 8} 66 L${tx + torsoW - 8} 66 Q${tx + torsoW} 66 ${tx + torsoW} 74 L${tx + torsoW - 2} 108 L${tx + 2} 108 Z`
            : `M${tx} 76 Q${tx} 66 ${tx + 7} 66 L${tx + torsoW - 7} 66 Q${tx + torsoW} 66 ${tx + torsoW} 76 L${tx + torsoW - 4} 108 L${tx + 4} 108 Z`
        }
        fill={outfit}
      />
      {/* Collar */}
      <path d="M53 66 L60 74 L67 66 Z" fill={skin} />

      {/* Armor over torso */}
      {equipped.armor && <Armor id={equipped.armor} body={avatar.body} />}

      {/* Neck + head */}
      <rect x="54" y="56" width="12" height="10" fill={skin} />
      <rect x="37" y="18" width="46" height="44" rx="21" fill={skin} />

      {/* Face */}
      <circle cx="51" cy="42" r="2.8" fill={INK} />
      <circle cx="69" cy="42" r="2.8" fill={INK} />
      <path d="M53 51 Q60 56 67 51" stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" />

      {/* Hair, then helmet on top of it */}
      <Hair style={avatar.hair} color={hairColor} />
      {equipped.helmet && <Helmet id={equipped.helmet} />}

      {/* Held gear */}
      {equipped.shield && <Shield id={equipped.shield} />}
      {equipped.weapon && <Weapon id={equipped.weapon} />}
    </svg>
  );
}
