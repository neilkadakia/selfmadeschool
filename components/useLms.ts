"use client";

// LMS state: a module-level store shared by every component via
// useSyncExternalStore. Signed-in users sync to the school server
// (PHP API) with a debounced push; local storage is the offline cache,
// keyed per account so profiles never bleed into each other.

import { useSyncExternalStore } from "react";
import { COURSES, XP, XP_EXTRA, FINAL_PASS, levelFor, type Badge, badgeById } from "@/lib/lms";
import {
  BATTLE,
  CREDITS,
  DEFAULT_AVATAR,
  gearById,
  type AvatarConfig,
  type AvatarState,
  type Equipped,
  type GearSlot,
} from "@/lib/game";
import { MASTER_STREAK, XP_MASTERED, type MasteryMap } from "@/lib/mastery";
import {
  apiGetProgress,
  apiImpersonate,
  apiLogin,
  apiLogout,
  apiPutProgress,
  apiWhoami,
  type AuthUser,
} from "@/lib/api";

const KEY = "sms-lms-v2";
const V1_KEY = "sms-progress-v1";
const AUTH_KEY = "sms-auth-v1";
// While Acting As someone, the real account waits here.
const ACTOR_KEY = "sms-auth-actor-v1";
const PUSH_DEBOUNCE_MS = 1500;

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
  lastUnitDay: string; // last day a unit was completed (yyyy-mm-dd), for Today's Plan
  reviewLast: string; // last Study Hall session day (yyyy-mm-dd)
  finals: Record<string, { score: number; total: number; passed: boolean; date: string }>;
  feedbackAt: string; // when this student submitted their quote ("" = never)
  theme: "dark" | "light"; // LMS appearance, follows the account
  credits: number; // spendable school credits (XP is never spent)
  avatar: AvatarState;
  gear: string[]; // owned gear ids
  equipped: Equipped;
  battles: Record<string, { won: boolean; attempts: number; date: string }>; // partKey -> record
  mastery: MasteryMap; // questionKey -> miss/streak history (the make-up pile)
};

export type Reward = { xp: number; credits: number; badges: Badge[]; levelUp?: string };
export type SyncStatus = "idle" | "saving" | "saved" | "error";

type Snapshot = {
  state: LmsState;
  loaded: boolean;
  reward: Reward | null;
  auth: AuthUser | null;
  actor: AuthUser | null; // set while Acting As: the real signed-in account
  sync: SyncStatus;
};

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
  lastUnitDay: "",
  reviewLast: "",
  finals: {},
  feedbackAt: "",
  theme: "dark",
  credits: 0,
  avatar: DEFAULT_AVATAR,
  gear: [],
  equipped: {},
  battles: {},
  mastery: {},
};

const SERVER_SNAPSHOT: Snapshot = {
  state: EMPTY,
  loaded: false,
  reward: null,
  auth: null,
  actor: null,
  sync: "idle",
};

let snapshot: Snapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();
let pushTimer: ReturnType<typeof setTimeout> | null = null;

function emit(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((l) => l());
}

function storageKey(auth: AuthUser | null): string {
  return auth ? `${KEY}:${auth.email}` : KEY;
}

function persistLocal(state: LmsState, auth: AuthUser | null) {
  try {
    localStorage.setItem(storageKey(auth), JSON.stringify(state));
  } catch {
    // Private mode or blocked storage — progress just won't persist locally.
  }
}

function readLocal(auth: AuthUser | null): LmsState | null {
  try {
    const raw = localStorage.getItem(storageKey(auth));
    if (raw) return { ...EMPTY, ...JSON.parse(raw) };
  } catch {}
  return null;
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

function readAuth(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function persistAuth(auth: AuthUser | null) {
  try {
    if (auth) localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
    else localStorage.removeItem(AUTH_KEY);
  } catch {}
}

function readActor(): AuthUser | null {
  try {
    const raw = localStorage.getItem(ACTOR_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function persistActor(actor: AuthUser | null) {
  try {
    if (actor) localStorage.setItem(ACTOR_KEY, JSON.stringify(actor));
    else localStorage.removeItem(ACTOR_KEY);
  } catch {}
}

// A session died server-side. If we were Acting As someone, fall back
// to the real account; otherwise sign out locally too.
function dropDeadSession() {
  const actor = snapshot.actor;
  if (actor) {
    persistActor(null);
    persistAuth(actor);
    emit({ auth: actor, actor: null, state: readLocal(actor) ?? EMPTY, sync: "idle" });
    void pullServerState(actor);
  } else {
    persistAuth(null);
    emit({ auth: null, sync: "idle" });
  }
}

function schedulePush() {
  const { auth } = snapshot;
  if (!auth) return;
  if (pushTimer) clearTimeout(pushTimer);
  emit({ sync: "saving" });
  pushTimer = setTimeout(async () => {
    const current = snapshot;
    if (!current.auth) return;
    const res = await apiPutProgress(current.auth.token, current.state);
    if (res.status === 401) {
      dropDeadSession();
      return;
    }
    emit({ sync: res.ok ? "saved" : "error" });
  }, PUSH_DEBOUNCE_MS);
}

// Refresh identity fields (name, first, last, phone) from the server so a
// contact card filed on one device shows up on every other one.
async function refreshAuthUser(auth: AuthUser) {
  const res = await apiWhoami(auth.token);
  if (!res.ok) return;
  const user = res.data.user as Partial<AuthUser> | undefined;
  const current = snapshot.auth;
  if (!user || !current || current.token !== auth.token) return;
  const next = { ...current, ...user, token: auth.token };
  persistAuth(next);
  emit({ auth: next });
}

// Pull the account's progress from the server; adopt local progress upward
// if the server has none yet (first sign-in keeps anonymous work).
async function pullServerState(auth: AuthUser) {
  void refreshAuthUser(auth);
  const res = await apiGetProgress(auth.token);
  if (res.status === 401) {
    if (snapshot.auth?.token === auth.token) dropDeadSession();
    return;
  }
  if (!res.ok) {
    emit({ sync: "error" });
    return;
  }
  const serverState = res.data.state as LmsState | null;
  if (serverState) {
    const state = withDerivedBadges({ ...EMPTY, ...serverState });
    persistLocal(state, auth);
    emit({ state, sync: "saved" });
  } else {
    // New account: keep whatever progress is on this device and push it up.
    persistLocal(snapshot.state, auth);
    const put = await apiPutProgress(auth.token, snapshot.state);
    emit({ sync: put.ok ? "saved" : "error" });
  }
}

function ensureLoaded() {
  if (snapshot.loaded || typeof window === "undefined") return;
  const auth = readAuth();
  const actor = readActor();
  let state = readLocal(auth);
  if (!state && !auth) state = migrateV1();
  emit({ state: state ?? EMPTY, auth, actor: auth ? actor : null, loaded: true });
  if (auth) void pullServerState(auth);
}

// Apply a mutation, derive badges, persist, sync, and surface rewards.
function apply(fn: (s: LmsState) => LmsState) {
  const prev = snapshot.state;
  const next = withDerivedBadges(fn(prev));
  if (next === prev) return;
  const gainedXp = next.xp - prev.xp;
  const gainedCredits = next.credits - prev.credits;
  const newBadges = next.badges
    .filter((b) => !prev.badges.includes(b))
    .map(badgeById)
    .filter((b): b is Badge => Boolean(b));
  const prevLevel = levelFor(prev.xp);
  const nextLevel = levelFor(next.xp);
  const levelUp = nextLevel.index > prevLevel.index ? nextLevel.name : undefined;
  persistLocal(next, snapshot.auth);
  emit({
    state: next,
    reward:
      gainedXp > 0 || gainedCredits > 0 || newBadges.length > 0 || levelUp
        ? {
            xp: Math.max(0, gainedXp),
            credits: Math.max(0, gainedCredits),
            badges: newBadges,
            levelUp,
          }
        : snapshot.reward,
  });
  schedulePush();
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

  async login(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
    const res = await apiLogin(email, password);
    if (!res.ok) {
      return { ok: false, error: (res.data.error as string) ?? "Sign-in failed." };
    }
    const user = res.data.user as Omit<AuthUser, "token">;
    const auth: AuthUser = { ...user, token: res.data.token as string };
    persistAuth(auth);
    persistActor(null); // a fresh sign-in is never an impersonation
    // Carry this device's progress into the account (server copy wins if it exists).
    let state = snapshot.state;
    if (!state.name && user.name) state = { ...state, name: user.name };
    emit({ auth, actor: null, state });
    await pullServerState(auth);
    return { ok: true };
  },

  logout() {
    const { auth, actor } = snapshot;
    if (auth) apiLogout(auth.token);
    // Signing out while Acting As ends BOTH sessions — no ghost admin.
    if (actor) apiLogout(actor.token);
    if (pushTimer) clearTimeout(pushTimer);
    persistAuth(null);
    persistActor(null);
    const anon = readLocal(null) ?? EMPTY;
    emit({ auth: null, actor: null, state: anon, sync: "idle" });
  },

  // Act As: swap the session for a lower-ranked account; the real one
  // waits in the actor slot. Their progress loads exactly as if they
  // signed in — because as far as the store cares, they did.
  async actAs(email: string): Promise<{ ok: boolean; error?: string }> {
    const { auth } = snapshot;
    if (!auth) return { ok: false, error: "Not signed in." };
    const res = await apiImpersonate(auth.token, email);
    if (!res.ok) {
      return { ok: false, error: (res.data.error as string) ?? "Could not act as that account." };
    }
    const user = res.data.user as Omit<AuthUser, "token">;
    const next: AuthUser = { ...user, token: res.data.token as string };
    if (pushTimer) clearTimeout(pushTimer);
    persistActor(auth);
    persistAuth(next);
    emit({ auth: next, actor: auth, state: readLocal(next) ?? EMPTY, sync: "idle" });
    await pullServerState(next);
    return { ok: true };
  },

  // Hand the keys back: kill the impersonated session, restore yourself.
  returnToSelf() {
    const { auth, actor } = snapshot;
    if (!actor) return;
    if (auth) apiLogout(auth.token);
    if (pushTimer) clearTimeout(pushTimer);
    persistActor(null);
    persistAuth(actor);
    emit({ auth: actor, actor: null, state: readLocal(actor) ?? EMPTY, sync: "idle" });
    void pullServerState(actor);
  },

  toggleDone(course: string, unit: string) {
    apply((s) => {
      const list = s.done[course] ?? [];
      if (list.includes(unit)) {
        return {
          ...s,
          done: { ...s.done, [course]: list.filter((u) => u !== unit) },
          xp: Math.max(0, s.xp - XP.unit),
          credits: Math.max(0, s.credits - CREDITS.unit),
        };
      }
      return touchStreak({
        ...s,
        done: { ...s.done, [course]: [...list, unit] },
        xp: s.xp + XP.unit,
        credits: s.credits + CREDITS.unit,
        lastUnitDay: localDay(),
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
        credits: s.credits + (firstPerfect ? CREDITS.quizPerfect : 0),
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
      let next: LmsState = {
        ...s,
        decksDone: [...s.decksDone, key],
        xp: s.xp + XP.deck,
        credits: s.credits + CREDITS.deck,
      };
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

  // Study Hall: XP once per local day, streak counts every session.
  reviewDone() {
    apply((s) => {
      const today = localDay();
      const firstToday = s.reviewLast !== today;
      let next: LmsState = {
        ...s,
        reviewLast: today,
        xp: s.xp + (firstToday ? XP_EXTRA.review : 0),
      };
      if (!next.badges.includes("study-hall")) {
        next = { ...next, badges: [...next.badges, "study-hall"] };
      }
      return touchStreak(next);
    });
  },

  // No XP for feedback on purpose — quotes stay unbought.
  feedbackDone() {
    apply((s) => (s.feedbackAt ? s : { ...s, feedbackAt: localDay() }));
  },

  setTheme(theme: "dark" | "light") {
    apply((s) => (s.theme === theme ? s : { ...s, theme }));
  },

  // After the server accepts new profile details (Student ID, rename),
  // keep the session — and the certificate name — in step.
  adoptAuthUser(user: Partial<Omit<AuthUser, "token">>) {
    if (!snapshot.auth) return;
    const auth = { ...snapshot.auth, ...user };
    persistAuth(auth);
    emit({ auth });
    apply((s) => (s.name === auth.name ? s : { ...s, name: auth.name }));
  },

  // Wipes learning data; keeps identity, theme, and the submitted-quote flag.
  resetProgress() {
    apply((s) => ({
      ...EMPTY,
      name: s.name,
      theme: s.theme,
      feedbackAt: s.feedbackAt,
    }));
  },

  // Per-question learning history. A miss puts the question in the
  // make-up pile; MASTER_STREAK consecutive right answers retire it
  // (with a little XP and, the first time, the Comeback badge).
  questionResult(qkey: string, correct: boolean) {
    apply((s) => {
      const prev = s.mastery[qkey];
      if (correct) {
        if (!prev || prev.miss === 0 || prev.streak >= MASTER_STREAK) return s;
        const streak = prev.streak + 1;
        const mastered = streak >= MASTER_STREAK;
        let next: LmsState = {
          ...s,
          mastery: { ...s.mastery, [qkey]: { ...prev, streak, last: localDay() } },
          xp: s.xp + (mastered ? XP_MASTERED : 0),
        };
        if (mastered && !next.badges.includes("comeback")) {
          next = { ...next, badges: [...next.badges, "comeback"] };
        }
        return next;
      }
      return {
        ...s,
        mastery: {
          ...s.mastery,
          [qkey]: { miss: (prev?.miss ?? 0) + 1, streak: 0, last: localDay() },
        },
      };
    });
  },

  // Picture Day. First save also pays out back-pay Credits for work
  // already done, so long-time students don't start the shop broke.
  saveAvatar(cfg: AvatarConfig) {
    apply((s) => {
      let credits = s.credits;
      if (!s.avatar.created) {
        const unitsDone = Object.values(s.done).reduce((a, b) => a + b.length, 0);
        let perfects = 0;
        for (const c of COURSES) {
          for (const [slug, lesson] of Object.entries(c.lessons)) {
            if ((s.quizBest[`${c.slug}/${slug}`] ?? -1) >= lesson.quiz.length) perfects++;
          }
        }
        credits +=
          unitsDone * CREDITS.unit + perfects * CREDITS.quizPerfect + s.decksDone.length * CREDITS.deck;
      }
      return { ...s, credits, avatar: { ...cfg, created: true } };
    });
  },

  buyGear(id: string) {
    const item = gearById(id);
    apply((s) => {
      if (!item || s.gear.includes(id) || s.credits < item.price) return s;
      let next: LmsState = {
        ...s,
        credits: s.credits - item.price,
        gear: [...s.gear, id],
        equipped: { ...s.equipped, [item.slot]: id },
      };
      if (!next.badges.includes("suited-up")) {
        next = { ...next, badges: [...next.badges, "suited-up"] };
      }
      return next;
    });
  },

  setEquipped(slot: GearSlot, id: string | null) {
    apply((s) => {
      if (id !== null && !s.gear.includes(id)) return s;
      const equipped = { ...s.equipped };
      if (id === null) delete equipped[slot];
      else equipped[slot] = id;
      return { ...s, equipped };
    });
  },

  // Arena outcome. Attempts count feeds the question-order seed; the
  // first win on a boss pays out, rematches are for pride (and a little XP).
  battleResult(key: string, won: boolean) {
    apply((s) => {
      const prev = s.battles[key];
      const firstWin = won && !prev?.won;
      let next: LmsState = {
        ...s,
        battles: {
          ...s.battles,
          [key]: {
            won: Boolean(prev?.won) || won,
            attempts: (prev?.attempts ?? 0) + 1,
            date: localDay(),
          },
        },
        xp: s.xp + (firstWin ? BATTLE.xpFirstWin : won ? BATTLE.xpRematchWin : 0),
        credits: s.credits + (firstWin ? CREDITS.battleFirstWin : 0),
      };
      if (firstWin && !next.badges.includes("slayer")) {
        next = { ...next, badges: [...next.badges, "slayer"] };
      }
      return won ? touchStreak(next) : next;
    });
  },

  finalResult(course: string, score: number, total: number) {
    apply((s) => {
      const passed = score >= FINAL_PASS;
      const prev = s.finals[course];
      const firstPass = passed && !prev?.passed;
      const best =
        !prev || score > prev.score
          ? { score, total, passed: passed || Boolean(prev?.passed), date: localDay() }
          : { ...prev, passed: prev.passed || passed };
      let next: LmsState = {
        ...s,
        finals: { ...s.finals, [course]: best },
        xp: s.xp + (firstPass ? XP_EXTRA.final : 0),
      };
      if (firstPass && !next.badges.includes("honors")) {
        next = { ...next, badges: [...next.badges, "honors"] };
      }
      return touchStreak(next);
    });
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
    auth: snap.auth,
    actor: snap.actor,
    sync: snap.sync,
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
