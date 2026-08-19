// Live teaching: Office Hours and one-on-one time.
//
// Office Hours already exist server-side (api/sessions.php): faculty schedule
// them, students hold a seat, a waitlist auto-promotes when somebody drops,
// and the join link only ever reaches a seat-holder. This module is the app's
// side of that, plus the booking calls for one-on-one time.

import { apiCall } from "./api";

export type Session = {
  id: string;
  title: string;
  blurb: string;
  startsAt: string;
  durationMin: number;
  capacity: number;
  host: string;
  seats: number;
  /** Only ever sent to somebody actually holding a seat. */
  link?: string;
  /** "in" means you hold a seat. Matches session_row() in sessions.php. */
  you: "in" | "waitlist" | null;
  waiting: number;
  waitSpot: number | null;
};

export async function listSessions(token: string) {
  return apiCall<{ sessions?: Session[]; error?: string }>("sessions.php", { token });
}

export async function rsvp(token: string, id: string) {
  return apiCall<{ session?: Session; error?: string }>("sessions.php", {
    method: "POST",
    token,
    body: { action: "rsvp", id },
  });
}

export async function cancelSeat(token: string, id: string) {
  return apiCall<{ session?: Session; error?: string }>("sessions.php", {
    method: "POST",
    token,
    body: { action: "cancel", id },
  });
}

// ---------- one-on-one ----------

export type Slot = {
  id: string;
  educator: string;
  educatorName: string;
  startsAt: string;
  durationMin: number;
  /** Set once somebody books it. */
  takenBy?: string;
  takenByName?: string;
  topic?: string;
  link?: string;
  /** True when this is your booking. */
  mine: boolean;
};

export async function listSlots(token: string) {
  return apiCall<{ slots?: Slot[]; mine?: Slot[]; error?: string }>("booking.php", { token });
}

export async function book(token: string, id: string, topic: string) {
  return apiCall<{ slot?: Slot; error?: string }>("booking.php", {
    method: "POST",
    token,
    body: { action: "book", id, topic },
  });
}

export async function cancelBooking(token: string, id: string) {
  return apiCall<{ error?: string }>("booking.php", {
    method: "POST",
    token,
    body: { action: "cancel", id },
  });
}

/** "Thu, Aug 20 at 4:00 PM", in the phone's own timezone. */
export function whenLine(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Minutes until it starts; negative once it has. */
export function minutesAway(iso: string): number {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return Number.POSITIVE_INFINITY;
  return Math.round((d - Date.now()) / 60000);
}
