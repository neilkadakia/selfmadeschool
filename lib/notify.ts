// The bell. Shapes mirror api/notify.php.

import { apiCall } from "./api";

export type Note = {
  id: string;
  kind: "reply" | "reaction" | "kudos" | "endorsed" | "bulletin" | "challenge" | "fieldwork";
  text: string;
  href: string;
  at: string;
  read: boolean;
};

export async function notifyList(token: string) {
  return apiCall("notify.php", { token });
}

export async function notifyAct(token: string, action: "read-all" | "clear", id?: string) {
  return apiCall("notify.php", { method: "POST", token, body: { action, id } });
}
