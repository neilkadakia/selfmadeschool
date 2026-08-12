"use client";

// All LMS progress lives in this browser — no accounts, no forms.
// A module-level store backed by localStorage; every component that calls
// useLms() shares the same live state via useSyncExternalStore.

import { useSyncExternalStore } from "react";
import { COURSES, XP, type Badge, badgeById } from "@/lib/lms";

const KEY = "sms-lms-v2";
const V1_KEY = "sms-progress-v1";

export type LmsState = {
  done: Record<string, string[]>; // courseSlug -> completed unit slugs
  quizBest: Record<string, number>; // "course/unit" -> best correct count
  decksDone: string[]; // "course/unit" flashcard decks finished
  notes: Record<string, string>; // "course/unit" -> note text
  xp: number;
  streak: { count: number; last: string }; // last = yyyy-mm-dd (local)
  activity: string[]; // recent active days, yyyy-mm-dd (local)
  badges: string[];
  name: string; // for the certificate
};

export type Reward = { xp: number; badges: Badge[] };

type Snapshot = { state: LmsState; loaded: boolean; reward: Reward | null };

const EMPTY: LmsState = {
  done: {},
  quizBest: {},
  decksDone: [],
  notes: {},
  xp: 0,
  streak: { count: 0, last: "" },
  activity: [],
  badges: [],
  name: "",
};

const SERVER_SNAPSHOT: Snapshot = { state: EMPTY, loaded: false, reward: null };

let snapshot: Snapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();

function emit(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((l) => l());
}

function persist(state: LmsState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private mode or blocked storage — progress just won't persist.
  }
}

function localDay(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function touchStreak(s: LmsState): LmsState {
  const today = localDay();
  if (s.streak.last === today) return s;
  const count = s.streak.last === localDay(-1) ? s.streak.count + 1 : 1;
  const activity = [...new Set([...s.activity, today])].slice(-30);
  return { ...s, streak: { count, last: today }, activity };
}

// Badges derived from totals; event-driven badges (quiz/deck/note) are added at the action site.
function withDerivedBadges(s: LmsState): LmsState {
  const earned = new Set(s.badges);
  const totalDone = Object.values(s.done).reduce((a, b) => a + b.length, 0);
  if (totalDone >= 1) earned.add("first-unit");
  if (totalDone >= 5) earned.add("five-units");
  for (const c of COURSES) {
    const dc = s.done[c.slug] ?? [];
    if (c.parts.some((p) => p.units.every((u) => dc.includes(u.slug)))) earned.add("part-done");
    if (c.parts.every((p) => p.units.every((u) => dc.includes(u.slug)))) earned.add("course-done");
  }
  if (COURSES.every((c) => (s.done[c.slug] ?? []).length > 0)) earned.add("well-rounded");
  if (s.streak.count >= 3) earned.add("streak-3");
  if (s.streak.count >= 7) earned.add("streak-7");
  if (earned.size === s.badges.length) return s;
  return { ...s, badges: [...earned] };
}

function migrateV1(): LmsState | null {
  try {
    const raw = localStorage.getItem(V1_KEY);
    if (!raw) return null;
    const old: string[] = JSON.parse(raw);
    if (!Array.isArray(old) || old.length === 0) return null;
    const renamed = old.map((s) => (s === "failure-reps" ? "rejection-practice" : s));
    return withDerivedBadges({
      ...EMPTY,
      done: { "the-13th-grade": renamed },
      xp: renamed.length * XP.unit,
    });
  } catch {
    return null;
  }
}

function ensureLoaded() {
  if (snapshot.loaded || typeof window === "undefined") return;
  let state = EMPTY;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...EMPTY, ...JSON.parse(raw) };
    else state = migrateV1() ?? EMPTY;
  } catch {}
  emit({ state, loaded: true });
}

// Apply a mutation, derive badges, persist, and surface any xp/badge gain as a reward toast.
function apply(fn: (s: LmsState) => LmsState) {
  const prev = snapshot.state;
  const next = withDerivedBadges(fn(prev));
  if (next === prev) return;
  const gainedXp = next.xp - prev.xp;
  const newBadges = next.badges
    .filter((b) => !prev.badges.includes(b))
    .map(badgeById)
    .filter((b): b is Badge => Boolean(b));
  persist(next);
  emit({
    state: next,
    reward:
      gainedXp > 0 || newBadges.length > 0
        ? { xp: Math.max(0, gainedXp), badges: newBadges }
        : snapshot.reward,
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  ensureLoaded();
  return () => listeners.delete(cb);
}

const actions = {
  clearReward() {
    if (snapshot.reward) emit({ reward: null });
  },

  toggleDone(course: string, unit: string) {
    apply((s) => {
      const list = s.done[course] ?? [];
      if (list.includes(unit)) {
        return {
          ...s,
          done: { ...s.done, [course]: list.filter((u) => u !== unit) },
          xp: Math.max(0, s.xp - XP.unit),
        };
      }
      return touchStreak({
        ...s,
        done: { ...s.done, [course]: [...list, unit] },
        xp: s.xp + XP.unit,
      });
    });
  },

  quizResult(course: string, unit: string, correct: number, total: number) {
    const key = `${course}/${unit}`;
    apply((s) => {
      const best = s.quizBest[key] ?? -1;
      const firstPerfect = correct === total && best < total;
      let next: LmsState = {
        ...s,
        quizBest: { ...s.quizBest, [key]: Math.max(best, correct) },
        xp: s.xp + (firstPerfect ? XP.quizPerfect : 0),
      };
      if (firstPerfect && !next.badges.includes("quiz-perfect")) {
        next = { ...next, badges: [...next.badges, "quiz-perfect"] };
      }
      return touchStreak(next);
    });
  },

  deckDone(course: string, unit: string) {
    const key = `${course}/${unit}`;
    apply((s) => {
      if (s.decksDone.includes(key)) return s;
      let next: LmsState = { ...s, decksDone: [...s.decksDone, key], xp: s.xp + XP.deck };
      if (!next.badges.includes("deck-done")) {
        next = { ...next, badges: [...next.badges, "deck-done"] };
      }
      return touchStreak(next);
    });
  },

  saveNote(course: string, unit: string, text: string) {
    const key = `${course}/${unit}`;
    apply((s) => {
      const notes = { ...s.notes };
      if (text.trim()) notes[key] = text;
      else delete notes[key];
      let next: LmsState = { ...s, notes };
      if (text.trim() && !next.badges.includes("note-taker")) {
        next = { ...next, badges: [...next.badges, "note-taker"] };
      }
      return next;
    });
  },

  setName(name: string) {
    apply((s) => (s.name === name ? s : { ...s, name }));
  },
};

export function useLms() {
  const snap = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => SERVER_SNAPSHOT
  );

  return {
    state: snap.state,
    loaded: snap.loaded,
    reward: snap.reward,
    isDone: (course: string, unit: string) => (snap.state.done[course] ?? []).includes(unit),
    ...actions,
  };
}

export function courseProgress(state: LmsState, courseSlug: string) {
  const course = COURSES.find((c) => c.slug === courseSlug);
  const total = course ? course.parts.reduce((a, p) => a + p.units.length, 0) : 0;
  const done = (state.done[courseSlug] ?? []).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}
