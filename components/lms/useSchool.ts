"use client";

// The other half of the Faculty Lounge, from the student's side.
//
// Three things live on the server rather than in the synced progress blob,
// because faculty write them and the browser must never overwrite them:
// answers to Field Work, assignments, and which courses are open. This
// fetches all three once per sign-in and shares them across the classroom,
// so opening five unit pages does not mean five round trips.

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { fwMine, fwSeen, assignList, schoolMine, type Assignment, type Features } from "@/lib/faculty";
import { useLms } from "@/components/useLms";

export type ReplyToMe = { text: string; byName: string; at: string; seen: boolean };

type School = {
  loaded: boolean;
  replies: Record<string, ReplyToMe>;
  assignments: Assignment[];
  features: Features | null;
  access: Record<string, { open: boolean; needs: { name: string; price: number; cadence: string } | null }>;
};

const EMPTY: School = { loaded: false, replies: {}, assignments: [], features: null, access: {} };

let snapshot: School = EMPTY;
let loadedFor = "";
const listeners = new Set<() => void>();

function emit(next: Partial<School>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((l) => l());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function load(token: string) {
  const [replies, assignments, school] = await Promise.all([
    fwMine(token),
    assignList(token),
    schoolMine(token),
  ]);
  emit({
    loaded: true,
    replies: replies.ok ? ((replies.data.replies as Record<string, ReplyToMe>) ?? {}) : {},
    assignments: assignments.ok ? ((assignments.data.assignments as Assignment[]) ?? []) : [],
    features: school.ok ? (school.data.features as Features) : null,
    access: school.ok ? (school.data.access as School["access"]) : {},
  });
}

// Signing out, or signing in as somebody else, must not leave the previous
// person's answers on screen.
export function resetSchool() {
  loadedFor = "";
  snapshot = EMPTY;
  listeners.forEach((l) => l());
}

export function useSchool() {
  const lms = useLms();
  const token = lms.auth?.token ?? "";

  useEffect(() => {
    if (!token) {
      if (loadedFor !== "") resetSchool();
      return;
    }
    if (loadedFor === token) return;
    loadedFor = token;
    void load(token);
  }, [token]);

  const state = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => EMPTY
  );

  const refresh = useCallback(() => {
    if (token) void load(token);
  }, [token]);

  // Marking an answer read is fire and forget: the mark is a courtesy to
  // the teacher, not something worth blocking the reader on.
  const markSeen = useCallback(
    (key: string) => {
      if (!token || !snapshot.replies[key] || snapshot.replies[key].seen) return;
      emit({ replies: { ...snapshot.replies, [key]: { ...snapshot.replies[key], seen: true } } });
      void fwSeen(token, key);
    },
    [token]
  );

  const closeAssignment = useCallback(
    async (id: string, done: boolean) => {
      if (!token || !lms.auth) return;
      const { assignClose } = await import("@/lib/faculty");
      await assignClose(token, lms.auth.email, id, done);
      void load(token);
    },
    [token, lms.auth]
  );

  return { ...state, refresh, markSeen, closeAssignment };
}

// Whether this account may open a course. Answers true while the school is
// free, which is the state it ships in, so nothing is gated by accident.
export function useCourseOpen(slug: string): { known: boolean; open: boolean; needs: School["access"][string]["needs"] } {
  const school = useSchool();
  if (!school.loaded || !school.features) return { known: false, open: true, needs: null };
  if (!school.features.paid) return { known: true, open: true, needs: null };
  const a = school.access[slug];
  return { known: true, open: a?.open ?? true, needs: a?.needs ?? null };
}
