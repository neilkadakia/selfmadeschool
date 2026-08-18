// The Faculty Lounge client: everything behind the role ladder.
//
// Shapes here mirror what the PHP returns. Where the server can't answer a
// question honestly it sends null, and these types say so, so a room has
// to decide what to show instead of quietly rendering a zero.

import { apiCall } from "./api";

// ---------- shared ----------

export type Tone = "acc" | "vio" | "coral" | "lime" | "pink";

export type Features = {
  deadlines: boolean;
  paid: boolean;
  homerooms: boolean;
  fieldwork: boolean;
  honorRoll: boolean;
  prereqs: boolean;
  forms: boolean;
  broadcast: boolean;
  calendarLinks: boolean;
  certVerify: boolean;
};

// ---------- the Front Desk ----------

export type Pulse = {
  students: number;
  faculty: number;
  activeWeek: number;
  unitsDone: number;
  finalsPassed: number;
  quiet: number;
};

export type DeskFiling = {
  email: string;
  name: string;
  course: string;
  courseTitle: string;
  unit: string;
  unitTitle: string;
  note: string;
  date: string;
};

export type DeskQuestion = {
  id: string;
  email: string;
  name: string;
  text: string;
  created: string;
  ups: number;
  course: string;
  courseTitle: string;
  unit: string;
  unitTitle: string;
};

export type DeskQuiet = {
  email: string;
  name: string;
  days: number;
  units: number;
  streak: number;
  lastActive: string;
  nudges: boolean;
};

export type DeskNew = { email: string; name: string; joined: string; units: number };

export type DeskSession = {
  id: string;
  title: string;
  startsAt: string;
  capacity: number;
  seats: number;
  waiting: number;
};

export type Desk = {
  pulse: Pulse;
  fieldwork: DeskFiling[];
  fieldworkTotal: number;
  questions: DeskQuestion[];
  questionsTotal: number;
  quiet: DeskQuiet[];
  newest: DeskNew[];
  sessions: DeskSession[];
};

// ---------- the Gradebook ----------

export type RosterRow = {
  email: string;
  name: string;
  role: string;
  homeroom: string;
  plan: string;
  units: number;
  xp: number;
  streak: number;
  badges: number;
  finals: number;
  fieldwork: number;
  lastActive: string;
  joined: string;
  done: Record<string, string[]>;
  nudges: boolean;
};

export type RosterCourse = {
  slug: string;
  title: string;
  tone: Tone;
  units: { slug: string; title: string; taught: boolean }[];
};

export type Roster = {
  students: RosterRow[];
  courses: RosterCourse[];
  homerooms: { id: string; name: string; color: Tone }[];
  settings: Features;
};

// ---------- the Student File ----------

export type FileUnit = {
  slug: string;
  title: string;
  taught: boolean;
  done: boolean;
  quizBest: number;
  questions: number;
};

export type FileCourse = {
  slug: string;
  title: string;
  tone: Tone;
  done: number;
  total: number;
  pct: number;
  final: { score: number; total: number; passed: boolean; date: string } | null;
  units: FileUnit[];
};

export type Reply = {
  text: string;
  by?: string;
  byName: string;
  at: string;
  seen: boolean;
};

export type Filing = {
  key: string;
  course: string;
  courseTitle: string;
  unit: string;
  unitTitle: string;
  action: string;
  note: string;
  date: string;
  reply: Reply | null;
};

export type FacultyNote = {
  id: string;
  text: string;
  by: string;
  byName: string;
  at: string;
  edited?: string;
  mine: boolean;
};

export type Assignment = {
  id: string;
  course: string;
  courseTitle: string;
  unit: string;
  unitTitle: string;
  note: string;
  due: string;
  overdue: boolean;
  by: string;
  byName: string;
  created: string;
  done: boolean;
  doneAt: string;
};

export type StudentPost = {
  id: string;
  text: string;
  created: string;
  ups: number;
  endorsed: boolean;
  course: string;
  unit: string;
  unitTitle: string;
};

export type StudentFile = {
  student: {
    email: string;
    name: string;
    first: string;
    last: string;
    phone: string;
    dob: string;
    role: string;
    nudges: boolean;
    plan: string;
    homeroom: string;
    joined: string;
    lastActive: string;
  };
  stats: { xp: number; credits: number; streak: number; badges: string[]; activity: string[] };
  courses: FileCourse[];
  fieldwork: Filing[];
  posts: StudentPost[];
  notes: FacultyNote[];
  assignments: Assignment[];
  nudges: Record<string, string>;
  access: Record<string, boolean>;
};

// ---------- Field Work inbox ----------

export type InboxFiling = Filing & { email: string; name: string };
export type InboxCounts = { waiting: number; answered: number };

// ---------- Study Group feed ----------

export type FeedPost = {
  id: string;
  email: string;
  name: string;
  text: string;
  created: string;
  ups: number;
  endorsed: boolean;
  fromStaff: boolean;
  answered: boolean;
  course: string;
  courseTitle: string;
  unit: string;
  unitTitle: string;
};

// ---------- the Records Office ----------

export type Records = {
  pulse: {
    students: number;
    started: number;
    activeWeek: number;
    active30: number;
    unitsDone: number;
    finalsPassed: number;
    fieldworkFiled: number;
    avgStreak: number;
    onStreak: number;
  };
  // Null for educators: who signs up is the school's business.
  signups: { label: string; signups: number }[] | null;
  active: { day: string; students: number }[];
  funnel: {
    slug: string;
    title: string;
    tone: Tone;
    units: { slug: string; title: string; number: number; taught: boolean; done: number; filed: number; pct: number }[];
  }[];
  finals: {
    slug: string;
    title: string;
    sitters: number;
    attempts: number;
    passed: number;
    passRate: number | null;
    avgScore: number | null;
  }[];
  hard: {
    key: string;
    course: string;
    courseTitle: string;
    unit: string;
    unitTitle: string;
    number: number;
    ask: string;
    students: number;
    misses: number;
    stuck: number;
  }[];
  levels: { name: string; at: number; students: number }[];
};

// ---------- school configuration ----------

export type Plan = {
  id: string;
  name: string;
  blurb: string;
  price: number; // whole cents
  cadence: "once" | "month" | "year";
  courses: string[]; // slugs, or ["*"]
  active: boolean;
};

export type SchoolAdmin = {
  features: Features;
  plans: Plan[];
  defaultPlan: string;
  updated: string;
  updatedBy: string;
  roll: {
    email: string;
    name: string;
    plan: string;
    grants: string[];
    access: Record<string, boolean>;
  }[];
  courses: { slug: string; title: string; tone: Tone }[];
};

export type SchoolMine = {
  features: Features;
  access: Record<
    string,
    { open: boolean; why: string; needs: { id: string; name: string; blurb: string; price: number; cadence: string } | null }
  >;
  plan: Plan | null;
  plans: Plan[];
};

// ---------- homerooms ----------

export type Homeroom = {
  id: string;
  name: string;
  blurb: string;
  color: Tone;
  members: { email: string; name: string }[];
  count: number;
  created: string;
  by: string;
  byName: string;
};

// ---------- the log book ----------

export type AuditEntry = {
  at: string;
  actor: string;
  actorName: string;
  as: string;
  asName: string;
  role: string;
  action: string;
  subject: string;
  subjectName: string;
  detail: string;
};

// ---------- calls ----------

export const facDesk = (t: string) => apiCall("faculty.php?view=desk", { token: t });
export const facRoster = (t: string) => apiCall("faculty.php?view=roster", { token: t });
export const facStudent = (t: string, email: string) =>
  apiCall(`faculty.php?view=student&email=${encodeURIComponent(email)}`, { token: t });

export const fwInbox = (t: string, filter: "waiting" | "answered" | "all") =>
  apiCall(`fieldwork.php?inbox=1&filter=${filter}`, { token: t });
export const fwReply = (t: string, email: string, key: string, text: string) =>
  apiCall("fieldwork.php", { method: "POST", token: t, body: { action: "reply", email, key, text } });
export const fwDelete = (t: string, email: string, key: string) =>
  apiCall("fieldwork.php", { method: "POST", token: t, body: { action: "delete", email, key } });
// The student side: their own replies, and marking one read.
export const fwMine = (t: string) => apiCall("fieldwork.php", { token: t });
export const fwSeen = (t: string, key: string) =>
  apiCall("fieldwork.php", { method: "POST", token: t, body: { action: "seen", key } });

export const feedList = (t: string, filter: "waiting" | "endorsed" | "all") =>
  apiCall(`discuss.php?feed=1&filter=${filter}`, { token: t });

export const noteWrite = (t: string, email: string, text: string) =>
  apiCall("notes.php", { method: "POST", token: t, body: { action: "write", email, text } });
export const noteDelete = (t: string, email: string, id: string) =>
  apiCall("notes.php", { method: "POST", token: t, body: { action: "delete", email, id } });

export const assignList = (t: string, email?: string) =>
  apiCall(email ? `assign.php?email=${encodeURIComponent(email)}` : "assign.php", { token: t });
export const assignAll = (t: string) => apiCall("assign.php?all=1", { token: t });
export const assignGive = (
  t: string,
  a: { email?: string; homeroom?: string; course: string; unit: string; note: string; due?: string }
) => apiCall("assign.php", { method: "POST", token: t, body: { action: "assign", ...a } });
export const assignClose = (t: string, email: string, id: string, done: boolean) =>
  apiCall("assign.php", { method: "POST", token: t, body: { action: done ? "done" : "reopen", email, id } });
export const assignDrop = (t: string, email: string, id: string) =>
  apiCall("assign.php", { method: "POST", token: t, body: { action: "delete", email, id } });

export const roomList = (t: string) => apiCall("homeroom.php", { token: t });
export const roomCreate = (t: string, name: string, blurb: string, color: Tone) =>
  apiCall("homeroom.php", { method: "POST", token: t, body: { action: "create", name, blurb, color } });
export const roomMember = (t: string, id: string, email: string, add: boolean) =>
  apiCall("homeroom.php", { method: "POST", token: t, body: { action: add ? "add" : "remove", id, email } });
export const roomDelete = (t: string, id: string) =>
  apiCall("homeroom.php", { method: "POST", token: t, body: { action: "delete", id } });

export const recordsGet = (t: string) => apiCall("records.php", { token: t });
export const recordsCsv = (report: "students" | "funnel" | "fieldwork") =>
  `/api/records.php?csv=${report}`;

export const auditGet = (t: string, q = "") =>
  apiCall(`audit.php${q ? `?q=${encodeURIComponent(q)}` : ""}`, { token: t });

export const schoolMine = (t: string) => apiCall("school.php", { token: t });
export const schoolAdmin = (t: string) => apiCall("school.php?admin=1", { token: t });
export const schoolFeatures = (t: string, features: Partial<Features>) =>
  apiCall("school.php", { method: "POST", token: t, body: { action: "features", features } });
export const planSave = (t: string, plan: Partial<Plan>) =>
  apiCall("school.php", { method: "POST", token: t, body: { action: "save_plan", plan } });
export const planDrop = (t: string, id: string) =>
  apiCall("school.php", { method: "POST", token: t, body: { action: "drop_plan", id } });
export const planSet = (t: string, email: string, plan: string) =>
  apiCall("school.php", { method: "POST", token: t, body: { action: "set_plan", email, plan } });
export const accessGrant = (t: string, email: string, course: string, note = "") =>
  apiCall("school.php", { method: "POST", token: t, body: { action: "grant", email, course, note } });
export const accessRevoke = (t: string, email: string, course: string) =>
  apiCall("school.php", { method: "POST", token: t, body: { action: "revoke", email, course } });

export const nudgePersonal = (t: string, email: string, subject: string, message: string) =>
  apiCall("nudge.php", { method: "POST", token: t, body: { action: "personal", email, subject, message } });

export const bulletinPost = (
  t: string,
  n: { text: string; homeroom?: string; pinned?: boolean; until?: string }
) => apiCall("bulletin.php", { method: "POST", token: t, body: { action: "post", ...n } });
export const bulletinPin = (t: string, id: string, pinned: boolean) =>
  apiCall("bulletin.php", { method: "POST", token: t, body: { action: pinned ? "pin" : "unpin", id } });

// ---------- formatting ----------

// Whole cents to the price a person reads. $99, not $99.00, unless the
// cents are real.
export function money(cents: number): string {
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars.toLocaleString("en-US")}` : `$${dollars.toFixed(2)}`;
}

export function planPrice(p: Plan): string {
  if (p.price === 0) return "Free";
  return p.cadence === "once" ? money(p.price) : `${money(p.price)}/${p.cadence === "month" ? "mo" : "yr"}`;
}

// "3 days ago", for tables where an exact date is noise.
export function ago(iso: string): string {
  if (!iso) return "never";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 0) return "just now";
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "a month ago" : `${months} months ago`;
}
