// The student's progress: what they have done, and what it earned them.
//
// The school's rule is that the client owns this blob and writes it whole.
// That is fine with one device and quietly destructive with two: finish a unit
// on the phone, open the laptop, and the laptop's older copy lands on top.
// The web has always had that risk between browsers. The app is the second
// device for most people, so it merges instead of overwriting: pull the
// server's copy, fold ours into it, push the result. Every field has a rule
// that cannot lose work (see merge below), so the worst case is that two
// devices agree rather than one winning.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiCall } from "./api";
import { localDay, type MasteryMap, readEntry } from "./mastery";

const CACHE_KEY = "sms.progress";

export type Finals = Record<
  string,
  { score: number; total: number; passed: boolean; date: string }
>;

export type LmsState = {
  done: Record<string, string[]>;
  quizBest: Record<string, number>;
  decksDone: string[];
  notes: Record<string, string>;
  xp: number;
  streak: { count: number; last: string };
  activity: string[];
  badges: string[];
  name: string;
  lastUnitDay: string;
  reviewLast: string;
  finals: Finals;
  feedbackAt: string;
  theme: "dark" | "light";
  credits: number;
  avatar: Record<string, unknown>;
  gear: string[];
  equipped: Record<string, unknown>;
  battles: Record<string, { won: boolean; attempts: number; date: string }>;
  mastery: MasteryMap;
  fieldwork: Record<string, { date: string; note: string }>;
  doneAt: Record<string, string>;
  pace: number;
};

export function emptyState(): LmsState {
  return {
    done: {},
    quizBest: {},
    decksDone: [],
    notes: {},
    xp: 0,
    streak: { count: 0, last: "" },
    activity: [],
    badges: [],
    name: "",
    lastUnitDay: "",
    reviewLast: "",
    finals: {},
    feedbackAt: "",
    theme: "dark",
    credits: 0,
    avatar: {},
    gear: [],
    equipped: {},
    battles: {},
    mastery: {},
    fieldwork: {},
    doneAt: {},
    pace: 0,
  };
}

const uniq = (a: string[]) => Array.from(new Set(a));

/**
 * Fold two copies of the same student together.
 *
 * Every rule here is chosen so that nothing a student did can vanish:
 * lists union, counters take the larger, dated things take the later, and the
 * spacing schedule takes whichever entry was answered most recently, because
 * that is the one that knows the true box.
 */
export function merge(a: LmsState, b: LmsState): LmsState {
  const out = { ...a, ...b };

  out.done = {};
  for (const k of uniq([...Object.keys(a.done), ...Object.keys(b.done)])) {
    out.done[k] = uniq([...(a.done[k] ?? []), ...(b.done[k] ?? [])]);
  }

  out.quizBest = { ...a.quizBest };
  for (const [k, v] of Object.entries(b.quizBest)) {
    out.quizBest[k] = Math.max(a.quizBest[k] ?? 0, v);
  }

  out.decksDone = uniq([...a.decksDone, ...b.decksDone]);
  out.badges = uniq([...a.badges, ...b.badges]);
  out.gear = uniq([...a.gear, ...b.gear]);
  out.activity = uniq([...a.activity, ...b.activity]).sort().slice(-400);

  out.xp = Math.max(a.xp, b.xp);
  out.credits = Math.max(a.credits, b.credits);
  out.pace = Math.max(a.pace, b.pace);

  out.streak = a.streak.last >= b.streak.last ? a.streak : b.streak;
  out.lastUnitDay = a.lastUnitDay > b.lastUnitDay ? a.lastUnitDay : b.lastUnitDay;
  out.reviewLast = a.reviewLast > b.reviewLast ? a.reviewLast : b.reviewLast;
  out.feedbackAt = a.feedbackAt > b.feedbackAt ? a.feedbackAt : b.feedbackAt;
  out.name = b.name || a.name;

  // A note typed on one device should not silently replace a longer one typed
  // on the other. Same text, no contest; different text, keep both so the
  // student can throw one away themselves.
  out.notes = { ...a.notes };
  for (const [k, v] of Object.entries(b.notes)) {
    const mine = a.notes[k];
    if (!mine || mine === v) out.notes[k] = v;
    else if (v.includes(mine)) out.notes[k] = v;
    else if (mine.includes(v)) out.notes[k] = mine;
    else out.notes[k] = `${mine}\n\n${v}`;
  }

  out.doneAt = { ...b.doneAt, ...a.doneAt };
  for (const [k, v] of Object.entries(b.doneAt)) {
    const mine = a.doneAt[k];
    // The earlier date is the true one: that is when it was actually finished.
    out.doneAt[k] = mine && mine < v ? mine : v;
  }

  out.finals = { ...a.finals };
  for (const [k, v] of Object.entries(b.finals)) {
    const mine = a.finals[k];
    if (!mine) out.finals[k] = v;
    // A pass is never undone by a later fail, and a better score wins.
    else if (v.passed && !mine.passed) out.finals[k] = v;
    else if (v.passed === mine.passed && v.score > mine.score) out.finals[k] = v;
  }

  out.battles = { ...a.battles };
  for (const [k, v] of Object.entries(b.battles)) {
    const mine = a.battles[k];
    if (!mine) out.battles[k] = v;
    else
      out.battles[k] = {
        won: mine.won || v.won,
        attempts: Math.max(mine.attempts, v.attempts),
        date: mine.date > v.date ? mine.date : v.date,
      };
  }

  out.fieldwork = { ...a.fieldwork };
  for (const [k, v] of Object.entries(b.fieldwork)) {
    const mine = a.fieldwork[k];
    if (!mine || v.date > mine.date) out.fieldwork[k] = v;
  }

  // The spacing schedule: the entry answered most recently is the one telling
  // the truth about which box a question is in.
  out.mastery = { ...a.mastery };
  for (const [k, v] of Object.entries(b.mastery)) {
    const mine = a.mastery[k];
    if (!mine) {
      out.mastery[k] = v;
      continue;
    }
    const mineLast = mine.last || readEntry(mine).due;
    const theirsLast = v.last || readEntry(v).due;
    out.mastery[k] = theirsLast > mineLast ? v : mine;
  }

  return out;
}

/** Anything missing from an older or partial blob gets its default. */
export function hydrate(raw: unknown): LmsState {
  const base = emptyState();
  if (!raw || typeof raw !== "object") return base;
  return { ...base, ...(raw as Partial<LmsState>) } as LmsState;
}

export async function readCache(): Promise<LmsState> {
  try {
    const s = await AsyncStorage.getItem(CACHE_KEY);
    return s ? hydrate(JSON.parse(s)) : emptyState();
  } catch {
    return emptyState();
  }
}

export async function writeCache(state: LmsState): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(state));
  } catch {
    // A full disk should not take the classroom down.
  }
}

/** Pull the server's copy, fold in what we have, push it back. */
export async function sync(
  token: string,
  local: LmsState
): Promise<{ state: LmsState; synced: boolean }> {
  const got = await apiCall<{ state?: unknown }>("progress.php", { token });
  if (!got.ok) {
    await writeCache(local);
    return { state: local, synced: false };
  }
  const merged = merge(local, hydrate(got.data.state));
  const put = await apiCall("progress.php", {
    method: "PUT",
    token,
    body: { state: merged },
  });
  await writeCache(merged);
  return { state: merged, synced: put.ok };
}

// ---------- the small edits screens actually make ----------

export function markDone(state: LmsState, course: string, unit: string): LmsState {
  const list = state.done[course] ?? [];
  if (list.includes(unit)) return state;
  const day = localDay();
  return {
    ...state,
    done: { ...state.done, [course]: [...list, unit] },
    doneAt: { ...state.doneAt, [`${course}/${unit}`]: day },
    lastUnitDay: day,
    activity: uniq([...state.activity, day]),
  };
}

export function recordQuiz(
  state: LmsState,
  course: string,
  unit: string,
  correct: number
): LmsState {
  const key = `${course}/${unit}`;
  return {
    ...state,
    quizBest: { ...state.quizBest, [key]: Math.max(state.quizBest[key] ?? 0, correct) },
    activity: uniq([...state.activity, localDay()]),
  };
}

export function addXp(state: LmsState, xp: number): LmsState {
  return { ...state, xp: state.xp + Math.max(0, xp) };
}

/** Today counts if yesterday did; otherwise the streak starts over at one. */
export function touchStreak(state: LmsState): LmsState {
  const today = localDay();
  if (state.streak.last === today) return state;
  const yesterday = localDay(-1);
  const count = state.streak.last === yesterday ? state.streak.count + 1 : 1;
  return {
    ...state,
    streak: { count, last: today },
    activity: uniq([...state.activity, today]),
  };
}
