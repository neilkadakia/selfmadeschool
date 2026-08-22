// The curriculum, as the app sees it.
//
// Everything comes from api/content.php, which hands nothing over until
// course_access() has said yes. Nothing is compiled into the app, so a new
// unit is a server deploy rather than a store release, and a course that gets
// locked is locked on the phone too.
//
// Every response is cached in AsyncStorage under the shape it arrived in, so
// the second launch draws instantly and a launch with no signal draws the last
// thing we knew instead of a spinner and an apology.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiCall } from "./api";

export type LessonBlock =
  | { kind: "p"; text: string }
  | { kind: "h"; text: string }
  | { kind: "callout"; title: string; text: string }
  | { kind: "bigfact"; stat: string; caption: string }
  | { kind: "list"; title?: string; items: string[] }
  | { kind: "example"; title: string; text: string }
  | { kind: "quote"; text: string; who?: string }
  | { kind: "image"; src: string; alt: string; caption?: string }
  | { kind: "video"; src: string; poster?: string; caption?: string }
  | { kind: "embed"; src: string; title: string; caption?: string }
  | { kind: "audio"; src: string; title: string; caption?: string }
  | { kind: "file"; href: string; name: string; note?: string }
  | {
      kind: "split";
      title?: string;
      leftLabel: string;
      rightLabel: string;
      rows: { left: string; right: string }[];
    }
  | { kind: "steps"; title?: string; steps: { label: string; text: string }[] }
  // The web draws these; the app has no SVG, so it shows the written line the
  // drawing carries. Keep `art` a plain string here: the app must not fail to
  // parse a lesson because the website learned a new diagram.
  | { kind: "art"; art: string; alt: string; caption?: string }
  | {
      kind: "bars";
      title?: string;
      items: { label: string; value: number; display?: string; note?: string; tone?: Tone }[];
      caption?: string;
    }
  | {
      kind: "flow";
      title?: string;
      loop?: boolean;
      tone?: Tone;
      steps: { label: string; note?: string }[];
      caption?: string;
    }
  | {
      kind: "timeline";
      title?: string;
      points: { at: string; label: string; note?: string; tone?: Tone }[];
      caption?: string;
    }
  | {
      kind: "receipt";
      title?: string;
      lines: { label: string; value: string; note?: string; tone?: Tone }[];
      total?: { label: string; value: string };
      caption?: string;
    }
  | {
      kind: "scale";
      title?: string;
      left: string;
      right: string;
      marks: { at: number; label: string; tone?: Tone }[];
      caption?: string;
    }
  | { kind: "table"; title?: string; head: string[]; rows: string[][]; caption?: string }
  | { kind: "divider" };

export type Tone = "good" | "warn" | "plain";

export type QuizQuestion = { q: string; options: string[]; answer: number; explain: string };
export type Flashcard = { front: string; back: string };

export type Lesson = {
  hook: string;
  blocks: LessonBlock[];
  takeaways?: string[];
  theLesson?: string;
  quiz: QuizQuestion[];
  cards: Flashcard[];
  action: string;
};

export type UnitRow = {
  slug: string;
  title: string;
  /** Withheld by the server when the course is locked. */
  blurb?: string;
  live: boolean;
  taught: boolean;
};

export type PartRow = {
  id: string;
  name: string;
  tone: string;
  tagline: string;
  action: string;
  units: UnitRow[];
};

export type Access = {
  open: boolean;
  reason?: string;
  needs?: { slug: string; title: string };
  plan?: { id: string; name: string; blurb: string; price: number; cadence: string } | null;
};

export type CourseRow = {
  slug: string;
  title: string;
  kicker: string;
  tone: string;
  status: string;
  headline: string;
  description: string;
  parts: PartRow[];
  order: string[];
  access: Access;
};

const SHELF_KEY = "sms.shelf";
const lessonKey = (c: string, u: string) => `sms.lesson.${c}.${u}`;
const courseKey = (c: string) => `sms.course.${c}`;

async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const s = await AsyncStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}

async function cacheSet(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Out of space is not a reason to fail the screen.
  }
}

export type Fetched<T> = { data: T | null; fromCache: boolean; error?: string };

/** Every course, with its access verdict. Cached, so it draws offline. */
export async function getShelf(token: string, force = false): Promise<Fetched<CourseRow[]>> {
  if (!force) {
    const cached = await cacheGet<CourseRow[]>(SHELF_KEY);
    if (cached) {
      // Refresh behind the drawn screen; the caller re-reads on next mount.
      void refreshShelf(token);
      return { data: cached, fromCache: true };
    }
  }
  const r = await apiCall<{ courses?: CourseRow[]; error?: string }>("content.php", { token });
  if (r.ok && r.data.courses) {
    await cacheSet(SHELF_KEY, r.data.courses);
    return { data: r.data.courses, fromCache: false };
  }
  const fallback = await cacheGet<CourseRow[]>(SHELF_KEY);
  return { data: fallback, fromCache: Boolean(fallback), error: r.data.error };
}

async function refreshShelf(token: string): Promise<void> {
  const r = await apiCall<{ courses?: CourseRow[] }>("content.php", { token });
  if (r.ok && r.data.courses) await cacheSet(SHELF_KEY, r.data.courses);
}

export async function getCourse(token: string, slug: string): Promise<Fetched<CourseRow>> {
  const r = await apiCall<{ course?: CourseRow; access?: Access; error?: string }>(
    `content.php?course=${encodeURIComponent(slug)}`,
    { token }
  );
  if (r.ok && r.data.course) {
    const row = { ...r.data.course, access: r.data.access ?? { open: true } };
    await cacheSet(courseKey(slug), row);
    return { data: row, fromCache: false };
  }
  const cached = await cacheGet<CourseRow>(courseKey(slug));
  return { data: cached, fromCache: Boolean(cached), error: r.data.error };
}

export async function getLesson(
  token: string,
  course: string,
  unit: string
): Promise<Fetched<Lesson>> {
  const cached = await cacheGet<Lesson>(lessonKey(course, unit));
  if (cached) return { data: cached, fromCache: true };

  const r = await apiCall<{ lesson?: Lesson; error?: string }>(
    `content.php?course=${encodeURIComponent(course)}&unit=${encodeURIComponent(unit)}`,
    { token }
  );
  if (r.ok && r.data.lesson) {
    await cacheSet(lessonKey(course, unit), r.data.lesson);
    return { data: r.data.lesson, fromCache: false };
  }
  return { data: null, fromCache: false, error: r.data.error };
}

/**
 * Take This Course Offline: one request for the whole course, then every
 * lesson written down. After this the course reads on a plane.
 */
export async function downloadCourse(
  token: string,
  slug: string
): Promise<{ ok: boolean; units: number; error?: string }> {
  const r = await apiCall<{ lessons?: Record<string, Lesson>; error?: string }>(
    `content.php?course=${encodeURIComponent(slug)}&all=1`,
    { token, timeoutMs: 45000 }
  );
  if (!r.ok || !r.data.lessons) {
    return { ok: false, units: 0, error: r.data.error ?? "Could not download that course." };
  }
  const entries = Object.entries(r.data.lessons);
  await AsyncStorage.multiSet(
    entries.map(([unit, lesson]) => [lessonKey(slug, unit), JSON.stringify(lesson)])
  );
  return { ok: true, units: entries.length };
}

/** Which units of a course are already on this phone. */
export async function downloadedUnits(slug: string, units: string[]): Promise<Set<string>> {
  const keys = units.map((u) => lessonKey(slug, u));
  try {
    const pairs = await AsyncStorage.multiGet(keys);
    const have = new Set<string>();
    pairs.forEach(([k, v]) => {
      if (v) have.add(k.replace(`sms.lesson.${slug}.`, ""));
    });
    return have;
  } catch {
    return new Set();
  }
}

export async function clearDownloads(slug: string, units: string[]): Promise<void> {
  await AsyncStorage.multiRemove(units.map((u) => lessonKey(slug, u)));
}
