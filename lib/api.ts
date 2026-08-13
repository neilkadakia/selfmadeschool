// Thin client for the PHP LMS API (same origin in production).

export type AuthUser = { email: string; name: string; role: "admin" | "student"; token: string };

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

export async function apiUserCreate(
  token: string,
  user: { email: string; password: string; name: string; role?: string }
) {
  return call("users.php", { method: "POST", token, body: { action: "create", ...user } });
}

export async function apiNewsletterList(token: string) {
  return call("newsletter.php", { token });
}

export async function apiChangePassword(token: string, current: string, next: string) {
  return call("auth.php", {
    method: "POST",
    token,
    body: { action: "change_password", current, next },
  });
}

export async function apiFeedbackSubmit(token: string, text: string, context: string) {
  return call("feedback.php", { method: "POST", token, body: { action: "submit", text, context } });
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
