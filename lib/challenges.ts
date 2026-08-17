// Challenges: a time-boxed push, measured from a baseline taken when you
// joined. Shapes mirror api/challenges.php.

import { apiCall } from "./api";

export type ChallengeMetric = "units" | "xp" | "posts" | "finals" | "streak";

export type Challenge = {
  id: string;
  name: string;
  blurb: string;
  metric: ChallengeMetric;
  metricName: string;
  unit: string;
  absolute: boolean;
  target: number;
  startsAt: string;
  endsAt: string;
  open: boolean;
  members: number;
  finished: number;
  finishers: string[];
  you: { joined: boolean; done: boolean; doneAt: string; progress: number } | null;
};

export type MetricSpec = { name: string; unit: string; absolute: boolean };

export async function challengeList(token: string) {
  return apiCall("challenges.php", { token });
}

export async function challengeJoin(token: string, id: string, join: boolean) {
  return apiCall("challenges.php", {
    method: "POST",
    token,
    body: { action: join ? "join" : "leave", id },
  });
}

export async function challengeCreate(
  token: string,
  c: {
    name: string;
    blurb: string;
    metric: ChallengeMetric;
    target: number;
    startsAt: string;
    endsAt: string;
  }
) {
  return apiCall("challenges.php", { method: "POST", token, body: { action: "create", ...c } });
}

export async function challengeDelete(token: string, id: string) {
  return apiCall("challenges.php", { method: "POST", token, body: { action: "delete", id } });
}
