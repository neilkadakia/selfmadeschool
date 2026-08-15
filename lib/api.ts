// Thin client for the PHP LMS API (same origin in production).

// The role ladder, lowest to highest. Rank gates every faculty surface,
// and Act As only reaches strictly below your own rank.
export type Role = "student" | "educator" | "admin" | "global_admin";

export const ROLE_RANK: Record<Role, number> = {
  student: 0,
  educator: 1,
  admin: 2,
  global_admin: 3,
};

export const ROLE_LABEL: Record<Role, string> = {
  student: "Student",
  educator: "Educator",
  admin: "Administrator",
  global_admin: "Global Admin",
};

export function rankOf(role: string | undefined): number {
  return ROLE_RANK[(role ?? "student") as Role] ?? 0;
}

// Educator and up — the people who see the Faculty Lounge.
export function isFaculty(role: string | undefined): boolean {
  return rankOf(role) >= ROLE_RANK.educator;
}

export type AuthUser = {
  email: string;
  name: string;
  first?: string;
  last?: string;
  phone?: string;
  dob?: string; // yyyy-mm-dd
  role: Role;
  nudges?: boolean; // mail preference — true unless opted out
  token: string;
};

// The Student ID is complete once the front office has all four.
export function profileComplete(
  u: { first?: string; last?: string; phone?: string; dob?: string } | null
): boolean {
  return Boolean(u && u.first && u.last && u.phone && u.dob);
}

const BASE = "/api";

async function call(
  path: string,
  opts: { method?: string; token?: string; body?: unknown } = {}
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  try {
    const res = await fetch(`${BASE}/${path}`, {
      method: opts.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(opts.token ? { "X-Auth-Token": opts.token } : {}),
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "Can't reach the school server." } };
  }
}

export async function apiLogin(email: string, password: string) {
  return call("auth.php", { method: "POST", body: { action: "login", email, password } });
}

export function apiLogout(token: string) {
  void call("auth.php", { method: "POST", token, body: { action: "logout" } });
}

export async function apiGetProgress(token: string) {
  return call("progress.php", { token });
}

export async function apiPutProgress(token: string, state: unknown) {
  return call("progress.php", { method: "PUT", token, body: { state } });
}

export async function apiUsersList(token: string) {
  return call("users.php", { token });
}

export async function apiClassOverview(token: string) {
  return call("progress.php?all=1", { token });
}

export async function apiUserCreate(
  token: string,
  user: {
    email: string;
    password: string;
    first: string;
    last: string;
    phone?: string;
    dob?: string;
    role?: string;
  }
) {
  return call("users.php", { method: "POST", token, body: { action: "create", ...user } });
}

export async function apiWhoami(token: string) {
  return call("auth.php", { token });
}

export async function apiImpersonate(token: string, email: string) {
  return call("auth.php", { method: "POST", token, body: { action: "impersonate", email } });
}

export async function apiSetRole(token: string, email: string, role: Role) {
  return call("users.php", { method: "POST", token, body: { action: "set_role", email, role } });
}

export async function apiNewsletterList(token: string) {
  return call("newsletter.php", { token });
}

export async function apiUpdateProfile(
  token: string,
  profile: { first: string; last: string; phone: string; dob: string }
) {
  return call("auth.php", { method: "POST", token, body: { action: "update_profile", ...profile } });
}

export async function apiSetPrefs(token: string, prefs: { nudges: boolean }) {
  return call("auth.php", { method: "POST", token, body: { action: "set_prefs", ...prefs } });
}

export async function apiNudgeInfo(token: string) {
  return call("nudge.php", { token });
}

export async function apiNudgeRun(token: string, dry: boolean) {
  return call("nudge.php", { method: "POST", token, body: { dry } });
}

export async function apiChangePassword(token: string, current: string, next: string) {
  return call("auth.php", {
    method: "POST",
    token,
    body: { action: "change_password", current, next },
  });
}

export async function apiFeedbackSubmit(token: string, text: string, context: string, rating = 0) {
  return call("feedback.php", {
    method: "POST",
    token,
    body: { action: "submit", text, context, rating },
  });
}

export async function apiFeedbackList(token: string) {
  return call("feedback.php", { token });
}

export async function apiFeedbackModerate(token: string, id: string, action: "approve" | "unapprove" | "delete") {
  return call("feedback.php", { method: "POST", token, body: { action, id } });
}

export async function apiQuotesPublic() {
  return call("feedback.php");
}

export async function apiLeaderboard(token: string) {
  return call("progress.php?leaderboard=1", { token });
}

// Office Hours: live sessions with seats and a self-promoting waitlist.
export type Session = {
  id: string;
  title: string;
  blurb: string;
  startsAt: string;
  durationMin: number;
  capacity: number;
  seats: number;
  waiting: number;
  host: string;
  you: "in" | "waitlist" | null;
  waitSpot: number | null;
  link?: string;
  rsvps?: string[]; // faculty only
  waitlist?: string[]; // faculty only
};

export async function apiSessions(token: string) {
  return call("sessions.php", { token });
}

export async function apiSessionAct(token: string, action: "rsvp" | "cancel" | "delete", id: string) {
  return call("sessions.php", { method: "POST", token, body: { action, id } });
}

export async function apiSessionCreate(
  token: string,
  s: { title: string; blurb: string; startsAt: string; durationMin: number; capacity: number; link: string }
) {
  return call("sessions.php", { method: "POST", token, body: { action: "create", ...s } });
}

// Study Group: one discussion thread per unit.
export type DiscussPost = {
  id: string;
  name: string;
  text: string;
  created: string;
  ups: number;
  youUp: boolean;
  endorsed: boolean;
  mine: boolean;
  email?: string; // faculty only
};

export async function apiDiscussList(token: string, course: string, unit: string) {
  return call(`discuss.php?course=${encodeURIComponent(course)}&unit=${encodeURIComponent(unit)}`, {
    token,
  });
}

export async function apiDiscussPost(token: string, course: string, unit: string, text: string) {
  return call("discuss.php", { method: "POST", token, body: { action: "post", course, unit, text } });
}

export async function apiDiscussAct(
  token: string,
  action: "upvote" | "endorse" | "unendorse" | "delete",
  id: string
) {
  return call("discuss.php", { method: "POST", token, body: { action, id } });
}

export async function apiBulletinList(token: string) {
  return call("bulletin.php", { token });
}

export async function apiBulletinPost(token: string, text: string) {
  return call("bulletin.php", { method: "POST", token, body: { action: "post", text } });
}

export async function apiBulletinDelete(token: string, id: string) {
  return call("bulletin.php", { method: "POST", token, body: { action: "delete", id } });
}

export async function apiRequestReset(email: string) {
  return call("auth.php", { method: "POST", body: { action: "request_reset", email } });
}

export async function apiResetPassword(email: string, code: string, next: string) {
  return call("auth.php", { method: "POST", body: { action: "reset_password", email, code, next } });
}

// The Registrar: server-graded finals.
export type FinalRecord = {
  score: number;
  total: number;
  passed: boolean;
  attempts: number;
  first: string;
  last: string;
};

export async function apiFinalSubmit(
  token: string,
  course: string,
  picks: { k: string; a: number }[]
) {
  return call("finals.php", { method: "POST", token, body: { course, picks } });
}

export async function apiFinalStatus(token: string) {
  return call("finals.php", { token });
}

export async function apiBackupInfo(token: string) {
  return call("backup.php", { token });
}

export async function apiBackupRun(token: string) {
  return call("backup.php", { method: "POST", token });
}
