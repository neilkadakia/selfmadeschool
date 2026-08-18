// Asking the school a question, and telling it something.
//
// Shapes mirror api/forms.php and api/broadcast.php. Both are behind their
// own switch, so every call here can legitimately answer 404 and the rooms
// have to cope rather than treat it as a fault.

import { apiCall } from "./api";

// ---------- forms ----------

export type FormKind = "poll" | "open";

export type WrittenAnswer = { name: string; email: string; text: string; at: string };

export type SchoolForm = {
  id: string;
  title: string;
  blurb: string;
  kind: FormKind;
  options: string[];
  homeroom: string;
  closed: boolean;
  created: string;
  answered: number;
  /** This person's own answer: an option index, their sentence, or null. */
  you: number | string | null;
  /** Polls only. Counts are public: seeing the room is the point. */
  counts?: number[];
  /** Open questions, faculty only. */
  written?: WrittenAnswer[];
};

export async function formsList(token: string) {
  return apiCall("forms.php", { token });
}

export async function formAnswer(token: string, id: string, value: number | string) {
  return apiCall("forms.php", { method: "POST", token, body: { action: "answer", id, value } });
}

export async function formCreate(
  token: string,
  f: { title: string; blurb: string; kind: FormKind; options: string[]; homeroom: string }
) {
  return apiCall("forms.php", { method: "POST", token, body: { action: "create", ...f } });
}

export async function formAct(token: string, action: "close" | "reopen" | "delete", id: string) {
  return apiCall("forms.php", { method: "POST", token, body: { action, id } });
}

// ---------- broadcast ----------

export type Audiences = {
  everyone: number;
  homerooms: { id: string; name: string; count: number }[];
  courses: { slug: string; title: string; count: number }[];
  homeroomsOn: boolean;
};

export type Broadcast = {
  id: string;
  subject: string;
  body: string;
  audience: "all" | "homeroom" | "course";
  audienceName: string;
  emailed: boolean;
  sent: string;
  by: string;
  reached: number;
  mailed: number;
  optedOut: number;
};

export async function audiencesList(token: string) {
  return apiCall("broadcast.php?audiences=1", { token });
}

export async function broadcastsList(token: string) {
  return apiCall("broadcast.php", { token });
}

export async function broadcastSend(
  token: string,
  b: { subject: string; body: string; audience: string; value: string; email: boolean }
) {
  return apiCall("broadcast.php", { method: "POST", token, body: { action: "send", ...b } });
}
