// Pure, seedable shuffle, safe to call during render (no Math.random).

export function seedFrom(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Options in a fresh order, with the right answer carried along.
//
// Authored quizzes drift: the correct option ends up in the same slot and
// written longer than the distractors, and a student learns to pick the long
// one in position B without knowing anything. Moving the options on every
// attempt takes the position half of that away for good, whatever the
// content does. `order` maps a displayed index back to the authored one,
// which the Final needs because the Registrar grades against the authored
// answer key.
export function shuffledOptions(
  options: string[],
  answer: number,
  seed: number
): { options: string[]; answer: number; order: number[] } {
  const order = shuffled(
    options.map((_, i) => i),
    seed
  );
  return {
    options: order.map((i) => options[i]),
    answer: order.indexOf(answer),
    order,
  };
}

export function shuffled<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed || 1;
  const rand = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
