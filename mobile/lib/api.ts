// Talking to the school.
//
// The API authenticates with a bearer token in X-Auth-Token, which is why the
// app needs no cookies and never meets CORS: that is a browser rule and this
// is not a browser. Tokens last thirty days server-side.
//
// Everything here returns a result rather than throwing. A school used on a
// phone is used on trains and in basements, and "the network is gone" is a
// normal Tuesday, not an exception. Screens are expected to render something
// honest when ok is false.

import Constants from "expo-constants";

export type ApiResult<T = Record<string, unknown>> = {
  ok: boolean;
  status: number;
  data: T;
  /** True when we never reached the school at all, as opposed to being told no. */
  offline: boolean;
};

/**
 * Where the school lives. EXPO_PUBLIC_API_BASE wins, so a staging or local
 * build is one environment variable rather than an edit to app.json that
 * somebody eventually commits by accident.
 */
export const API_BASE: string =
  process.env.EXPO_PUBLIC_API_BASE ??
  (Constants.expoConfig?.extra?.apiBase as string | undefined) ??
  "https://selfmadeschool.org/api";

const TIMEOUT_MS = 15000;

export async function apiCall<T = Record<string, unknown>>(
  path: string,
  opts: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    token?: string;
    body?: unknown;
    /** Longer for the whole-course download, which is a real payload. */
    timeoutMs?: number;
  } = {}
): Promise<ApiResult<T>> {
  const { method = "GET", token, body, timeoutMs = TIMEOUT_MS } = opts;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE}/${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { "X-Auth-Token": token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await res.text();
    let data: T;
    try {
      data = text ? (JSON.parse(text) as T) : ({} as T);
    } catch {
      // PHP fell over and sent HTML. Do not let a stack trace reach a student.
      return {
        ok: false,
        status: res.status,
        data: { error: "The school sent something we could not read." } as T,
        offline: false,
      };
    }
    return { ok: res.ok, status: res.status, data, offline: false };
  } catch (e) {
    const aborted = (e as Error)?.name === "AbortError";
    return {
      ok: false,
      status: 0,
      data: {
        error: aborted ? "That took too long. Check your signal." : "No connection.",
      } as T,
      offline: true,
    };
  } finally {
    clearTimeout(timer);
  }
}
