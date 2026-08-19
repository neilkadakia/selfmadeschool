// One copy of the student's progress, shared by every screen.
//
// Reads the phone's cache first so the desk draws immediately, then syncs with
// the school in the background. Every edit is applied locally at once and
// pushed after a short quiet period, because a student who answers six
// flashcards should cause one write, not six.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { useAuth } from "./auth";
import {
  emptyState,
  readCache,
  sync,
  writeCache,
  type LmsState,
} from "./progress";

const PUSH_AFTER_MS = 1500;

type StoreState = {
  state: LmsState;
  /** False until the phone's own copy has been read. */
  loaded: boolean;
  /** True when the last attempt to reach the school failed. */
  offline: boolean;
  /** Apply an edit now, push it shortly. */
  edit: (fn: (s: LmsState) => LmsState) => void;
  /** Push immediately, e.g. before a screen that must not lose an answer. */
  flush: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<StoreState | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [state, setState] = useState<LmsState>(emptyState);
  const [loaded, setLoaded] = useState(false);
  const [offline, setOffline] = useState(false);

  // The timer and the latest state live in refs so the debounce does not
  // restart on every render and never pushes a stale copy.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<LmsState>(state);
  latest.current = state;

  const push = useCallback(async () => {
    if (!token) {
      await writeCache(latest.current);
      return;
    }
    const r = await sync(token, latest.current);
    setState(r.state);
    setOffline(!r.synced);
  }, [token]);

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    await push();
  }, [push]);

  const edit = useCallback(
    (fn: (s: LmsState) => LmsState) => {
      setState((prev) => {
        const next = fn(prev);
        latest.current = next;
        void writeCache(next);
        return next;
      });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        void push();
      }, PUSH_AFTER_MS);
    },
    [push]
  );

  const refresh = useCallback(async () => {
    if (!token) return;
    const r = await sync(token, latest.current);
    setState(r.state);
    setOffline(!r.synced);
  }, [token]);

  // Boot: the cache, then the school.
  useEffect(() => {
    let alive = true;
    (async () => {
      const cached = await readCache();
      if (!alive) return;
      setState(cached);
      latest.current = cached;
      setLoaded(true);
      if (token) {
        const r = await sync(token, cached);
        if (!alive) return;
        setState(r.state);
        setOffline(!r.synced);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  // Leaving the app is the moment work is most likely to be lost, so anything
  // still waiting on the debounce goes now.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active" && timer.current) void flush();
    });
    return () => sub.remove();
  }, [flush]);

  const value = useMemo<StoreState>(
    () => ({ state, loaded, offline, edit, flush, refresh }),
    [state, loaded, offline, edit, flush, refresh]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProgress(): StoreState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useProgress outside ProgressProvider");
  return v;
}

// ---------- small readers screens keep asking for ----------

export function unitsDone(state: LmsState, course: string): string[] {
  return state.done[course] ?? [];
}

export function coursePct(state: LmsState, course: string, total: number): number {
  if (total <= 0) return 0;
  return Math.round((unitsDone(state, course).length / total) * 100);
}

/**
 * The ladder, copied from lib/lms.ts in the web repo. These numbers are a
 * contract: a student who is a Junior on the laptop must be a Junior here.
 */
export const LEVELS = [
  { at: 0, name: "Freshman" },
  { at: 300, name: "Sophomore" },
  { at: 700, name: "Junior" },
  { at: 1200, name: "Senior" },
  { at: 2000, name: "Valedictorian" },
  { at: 3000, name: "Self Made" },
] as const;

export function levelFor(xp: number) {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].at) index = i;
  const current = LEVELS[index];
  const next = LEVELS[index + 1];
  const pct = next
    ? Math.min(100, Math.round(((xp - current.at) / (next.at - current.at)) * 100))
    : 100;
  return { index, name: current.name, next: next?.name, nextAt: next?.at, pct };
}
