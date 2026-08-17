// The Quad and the Register: the part of the school that is other people.
//
// Shapes mirror api/quad.php and api/directory.php. Emails are typed optional
// because the server only sends them to faculty.

import { apiCall } from "./api";

export const REACTIONS = ["like", "celebrate", "insightful", "support"] as const;
export type Reaction = (typeof REACTIONS)[number];

export const REACTION_LABEL: Record<Reaction, string> = {
  like: "Like",
  celebrate: "Celebrate",
  insightful: "Insightful",
  support: "Support",
};

export type PostKind = "discussion" | "question" | "win";

export const POST_KIND_LABEL: Record<PostKind, string> = {
  discussion: "Discussion",
  question: "Question",
  win: "Win",
};

export type Club = {
  id: string;
  name: string;
  blurb: string;
  tone: string;
  course: string;
  staffOnly: boolean;
  members: number;
  joined: boolean;
  open: boolean;
  posts: number;
};

export type QuadComment = {
  id: string;
  name: string;
  text: string;
  created: string;
  mine: boolean;
  staff: boolean;
  email?: string;
};

export type QuadPost = {
  id: string;
  club: string;
  name: string;
  text: string;
  kind: PostKind;
  created: string;
  reactions: Record<Reaction, number>;
  yours: Reaction[];
  comments: QuadComment[];
  pinned: boolean;
  locked: boolean;
  staff: boolean;
  mine: boolean;
  email?: string;
  reports?: number;
  clubName?: string;
};

export type FeedEvent = {
  type: "post" | "kudos" | "final";
  at: string;
  name: string;
  text: string;
  club?: string;
  clubName?: string;
  kind?: PostKind;
  id?: string;
  comments?: number;
  toName?: string;
  yours?: boolean;
};

export type Person = {
  name: string;
  role: string;
  xp: number;
  streak: number;
  units: number;
  kudos: number;
  clubs: string[];
  homeroom: string;
  you: boolean;
  unlisted: boolean;
  handle: string;
  email?: string;
};

export type KudosNote = { from: string; note: string; at: string };

// ---------- the Quad ----------

export async function quadClubs(token: string) {
  return apiCall("quad.php?clubs=1", { token });
}

export async function quadClub(token: string, id: string) {
  return apiCall(`quad.php?club=${encodeURIComponent(id)}`, { token });
}

export async function quadFeed(token: string) {
  return apiCall("quad.php", { token });
}

export async function quadReported(token: string) {
  return apiCall("quad.php?reported=1", { token });
}

export async function quadJoin(token: string, club: string, join: boolean) {
  return apiCall("quad.php", {
    method: "POST",
    token,
    body: { action: join ? "join" : "leave", club },
  });
}

export async function quadPost(token: string, club: string, text: string, kind: PostKind) {
  return apiCall("quad.php", { method: "POST", token, body: { action: "post", club, text, kind } });
}

export async function quadComment(token: string, id: string, text: string) {
  return apiCall("quad.php", { method: "POST", token, body: { action: "comment", id, text } });
}

export async function quadReact(token: string, id: string, reaction: Reaction) {
  return apiCall("quad.php", { method: "POST", token, body: { action: "react", id, reaction } });
}

export type QuadAct =
  | "report"
  | "clear-reports"
  | "pin"
  | "unpin"
  | "lock"
  | "unlock"
  | "delete";

export async function quadAct(token: string, action: QuadAct, id: string) {
  return apiCall("quad.php", { method: "POST", token, body: { action, id } });
}

export async function quadDeleteComment(token: string, id: string, comment: string) {
  return apiCall("quad.php", {
    method: "POST",
    token,
    body: { action: "delete-comment", id, comment },
  });
}

// ---------- the Register ----------

export async function registerList(token: string) {
  return apiCall("directory.php", { token });
}

export async function giveKudos(token: string, handle: string, note: string) {
  return apiCall("directory.php", {
    method: "POST",
    token,
    body: { action: "kudos", handle, note },
  });
}

export async function setListed(token: string, listed: boolean) {
  return apiCall("auth.php", { method: "POST", token, body: { action: "set_prefs", listed } });
}
