import { useSyncExternalStore } from "react";

// One short line of encouragement, rotated by calendar day so the site says
// something a little different every time you come back. Kept in one place so
// the classroom and the marketing footer never drift apart.
//
// Callers render PEP_LINES[0] on the server and swap in the day's line after
// mount (see Footer and LearnHome): the pages are prerendered at build time,
// so picking by date during render would not match what the browser computes.

export const PEP_LINES = [
  "Wherever you are starting from today, that is a fine place to start.",
  "Nobody gets this on the first try. You are right on time.",
  "Twenty minutes today beats a perfect plan you never open.",
  "You are allowed to start over. You are also allowed to start over again. Just don't give up.",
  "The version of you from last month would be impressed.",
  "Confused is what learning feels like from the inside. Keep going.",
  "You do not have to be good at this yet. You just have to keep showing up.",
  "Progress still counts on the days it is quiet.",
  "Everyone you know who has their money together learned it after school, same as you.",
  "One unit. That is the whole ask today.",
  "Falling behind is a story. Picking it back up is a decision.",
  "You are building the one thing nobody can repossess.",
  "Small, boring, repeated. That is what winning actually looks like.",
  "Ask the question. Nobody in here thinks less of you for it.",
];

export function pepForDay(now = new Date()) {
  const day = Math.floor(now.getTime() / 86_400_000);
  return PEP_LINES[((day % PEP_LINES.length) + PEP_LINES.length) % PEP_LINES.length];
}

// The day's line is not the line the HTML was prerendered with, so it has to
// arrive on the client. useSyncExternalStore is the primitive for exactly that
// divergence; setting state in a mount effect causes a cascading render.
// Subscribing is a no-op because the line cannot change while the page is open.
const NEVER_CHANGES = () => () => {};
const firstPepLine = () => PEP_LINES[0];

export function usePepLine(): string {
  return useSyncExternalStore(NEVER_CHANGES, pepForDay, firstPepLine);
}
