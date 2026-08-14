// The game layer: avatars, Credits, gear, and Arena boss battles.
// Pure data + math — no storage here (that lives in useLms).

import { COURSES, type Course, type Part, type QuizQuestion } from "./lms";

// ---------- Avatar ----------

export type AvatarConfig = {
  body: number; // silhouette index
  skin: number; // SKIN_TONES index
  hair: number; // HAIR_STYLES index
  hairColor: number; // HAIR_COLORS index
  outfit: number; // OUTFIT_COLORS index
};

export type AvatarState = AvatarConfig & { created: boolean };

export const BODY_TYPES = ["Broad", "Slim"] as const;

export const SKIN_TONES = [
  { name: "Porcelain", color: "#f6d7b8" },
  { name: "Sand", color: "#eeb98a" },
  { name: "Bronze", color: "#cf9063" },
  { name: "Umber", color: "#a9713f" },
  { name: "Mahogany", color: "#7c4f2a" },
  { name: "Onyx", color: "#58351c" },
  { name: "Mint", color: "#9fe3b8" },
] as const;

export const HAIR_STYLES = [
  "Buzz",
  "Quiff",
  "Curls",
  "Long",
  "Topknot",
  "Clean + Beard",
] as const;

export const HAIR_COLORS = [
  { name: "Ink", color: "#23232a" },
  { name: "Espresso", color: "#4b2f1e" },
  { name: "Chestnut", color: "#91572a" },
  { name: "Honey", color: "#d9a441" },
  { name: "Copper", color: "#c14a3a" },
  { name: "Voltage Violet", color: "#8a6bf2" },
  { name: "Money Green", color: "#3fae6c" },
] as const;

export const OUTFIT_COLORS = [
  { name: "Cobalt", color: "#5B7CFA" },
  { name: "Alumni Green", color: "#2fae5f" },
  { name: "Amber", color: "#e39a2d" },
  { name: "Chalk", color: "#e9e4d6" },
  { name: "Brick", color: "#d0685e" },
  { name: "Charcoal", color: "#3a3a45" },
] as const;

export const DEFAULT_AVATAR: AvatarState = {
  created: false,
  body: 0,
  skin: 1,
  hair: 1,
  hairColor: 0,
  outfit: 0,
};

// ---------- Credits (the spendable currency; XP stays sacred) ----------

export const CREDITS = {
  unit: 20,
  quizPerfect: 10,
  deck: 5,
  battleFirstWin: 60,
} as const;

// ---------- Gear ----------

export type GearSlot = "weapon" | "shield" | "armor" | "helmet";

export type Gear = {
  id: string;
  slot: GearSlot;
  name: string;
  blurb: string;
  price: number;
  atk: number;
  def: number;
};

export const GEAR: Gear[] = [
  {
    id: "pencil",
    slot: "weapon",
    name: "Sharpened №2 Pencil",
    blurb: "Standard issue. Mightier than the sword, allegedly.",
    price: 40,
    atk: 5,
    def: 0,
  },
  {
    id: "red-pen",
    slot: "weapon",
    name: "Red Correction Pen",
    blurb: "Deals psychic damage. Monsters remember every mark.",
    price: 150,
    atk: 10,
    def: 0,
  },
  {
    id: "protractor",
    slot: "weapon",
    name: "Protractor Halberd",
    blurb: "Strikes at exactly the right angle. Every time.",
    price: 350,
    atk: 16,
    def: 0,
  },
  {
    id: "golden-ruler",
    slot: "weapon",
    name: "The Golden Ruler",
    blurb: "Legendary. He who holds it, measures up.",
    price: 650,
    atk: 24,
    def: 0,
  },
  {
    id: "binder-shield",
    slot: "shield",
    name: "Three-Ring Binder Shield",
    blurb: "Blocks attacks and holds your notes. Dual wield of duty.",
    price: 80,
    atk: 0,
    def: 4,
  },
  {
    id: "hall-pass",
    slot: "shield",
    name: "Laminated Hall Pass",
    blurb: "Bureaucracy cannot touch you. Neither can claws.",
    price: 300,
    atk: 0,
    def: 8,
  },
  {
    id: "cardboard-armor",
    slot: "armor",
    name: "Cardboard Costume Armor",
    blurb: "Held together with tape and confidence. Mostly confidence.",
    price: 120,
    atk: 0,
    def: 6,
  },
  {
    id: "varsity-jacket",
    slot: "armor",
    name: "Varsity Jacket of Vigor",
    blurb: "You lettered in adulthood. Wear it.",
    price: 260,
    atk: 0,
    def: 10,
  },
  {
    id: "grad-gown",
    slot: "armor",
    name: "Graduation Gown of Greatness",
    blurb: "Flows dramatically even indoors. +14 gravitas.",
    price: 520,
    atk: 0,
    def: 14,
  },
  {
    id: "thinking-cap",
    slot: "helmet",
    name: "The Thinking Cap",
    blurb: "A real one. The bulb lights up when you're onto something.",
    price: 90,
    atk: 0,
    def: 5,
  },
  {
    id: "mortarboard",
    slot: "helmet",
    name: "Mortarboard Helm",
    blurb: "The tassel doubles as a morale item.",
    price: 420,
    atk: 0,
    def: 9,
  },
];

export const GEAR_SLOTS: { slot: GearSlot; label: string }[] = [
  { slot: "weapon", label: "Weapons" },
  { slot: "shield", label: "Shields" },
  { slot: "armor", label: "Armor" },
  { slot: "helmet", label: "Helmets" },
];

export function gearById(id: string): Gear | undefined {
  return GEAR.find((g) => g.id === id);
}

export type Equipped = Partial<Record<GearSlot, string>>;

export function attackFor(equipped: Equipped): number {
  const weapon = equipped.weapon ? gearById(equipped.weapon) : undefined;
  return BATTLE.baseAtk + (weapon?.atk ?? 0);
}

export function defenseFor(equipped: Equipped): number {
  return (["shield", "armor", "helmet"] as GearSlot[]).reduce((sum, slot) => {
    const g = equipped[slot] ? gearById(equipped[slot]!) : undefined;
    return sum + (g?.def ?? 0);
  }, 0);
}

// ---------- Monsters + battles ----------

export type MonsterKind = "critic" | "kraken" | "fog" | "poltergeist";

export type Monster = {
  kind: MonsterKind;
  name: string;
  taunt: string;
  weakness: string; // shown as a hint — flavor, not mechanics
  color: string;
};

const MONSTERS_13: Monster[] = [
  {
    kind: "critic",
    name: "The Inner Critic",
    taunt: "\"You? Fighting me? That's adorable.\"",
    weakness: "Specific answers. It feeds on vague self-talk.",
    color: "#8a6bf2",
  },
  {
    kind: "kraken",
    name: "The Debt Kraken",
    taunt: "\"Minimum payments only, please.\"",
    weakness: "Compound interest — pointed the right way.",
    color: "#e0645c",
  },
  {
    kind: "fog",
    name: "The Great Overthink",
    taunt: "\"Are you SURE you want to attack? Really sure?\"",
    weakness: "Decided people. It cannot grip a made-up mind.",
    color: "#7f93b8",
  },
];

const MONSTERS_GENERIC: Monster[] = [
  {
    kind: "poltergeist",
    name: "The Pop Quiz Poltergeist",
    taunt: "\"Clear your desks. This WILL count.\"",
    weakness: "People who did the reading.",
    color: "#5B7CFA",
  },
  {
    kind: "poltergeist",
    name: "The Fine Print Fiend",
    taunt: "\"Just sign here. And here. Aaand here.\"",
    weakness: "Anyone who reads clause 4(b).",
    color: "#e39a2d",
  },
  {
    kind: "poltergeist",
    name: "The Deadline Wraith",
    taunt: "\"Due yesterday. Always due yesterday.\"",
    weakness: "A calendar with actual entries.",
    color: "#43DE7B",
  },
];

export function monsterFor(course: Course, partIndex: number): Monster {
  if (course.slug === "the-13th-grade" && MONSTERS_13[partIndex]) return MONSTERS_13[partIndex];
  return MONSTERS_GENERIC[partIndex % MONSTERS_GENERIC.length];
}

export const BATTLE = {
  playerHp: 100,
  baseAtk: 18,
  monsterHp: (partIndex: number) => 70 + 25 * (partIndex + 1),
  monsterAtk: (partIndex: number) => 22 + 6 * (partIndex + 1),
  minDamage: 6,
  xpFirstWin: 150,
  xpRematchWin: 25,
} as const;

export function partKey(courseSlug: string, partIndex: number): string {
  return `${courseSlug}/${partIndex}`;
}

// All quiz questions from a part's units that have lessons.
export function partQuestions(course: Course, part: Part): QuizQuestion[] {
  return part.units.flatMap((u) => course.lessons[u.slug]?.quiz ?? []);
}

export type BossEntry = {
  course: Course;
  part: Part;
  partIndex: number;
  monster: Monster;
  key: string;
};

export function allBosses(): BossEntry[] {
  return COURSES.flatMap((course) =>
    course.parts.map((part, partIndex) => ({
      course,
      part,
      partIndex,
      monster: monsterFor(course, partIndex),
      key: partKey(course.slug, partIndex),
    }))
  );
}
