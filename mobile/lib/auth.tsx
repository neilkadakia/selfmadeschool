// Who is signed in.
//
// The token goes to the Keychain on iOS and the Keystore on Android (see
// lib/secure.ts), never plain storage: it is a thirty-day key to somebody's
// school account. The
// user record beside it is cached in AsyncStorage so the app can draw a name
// and a role before the network answers, or when it never does.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { deleteSecret, getSecret, setSecret } from "./secure";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiCall } from "./api";

const TOKEN_KEY = "sms.token";
const USER_KEY = "sms.user";

export type User = {
  email: string;
  name: string;
  role: "student" | "educator" | "admin" | "global_admin";
  phone?: string;
  birthday?: string;
  plan?: string;
  unlisted?: boolean;
  nudgesOff?: boolean;
};

type AuthState = {
  /** Undefined while we are still reading storage: draw a splash, not a login. */
  ready: boolean;
  token: string | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  /** The school has no open registration: the public door is the waitlist. */
  joinWaitlist: (email: string) => Promise<{ ok: boolean; already?: boolean; error?: string }>;
  requestReset: (email: string) => Promise<{ ok: boolean; error?: string }>;
  resetPassword: (
    email: string,
    code: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  /** Re-read the account from the server; also how we notice an expired token. */
  refresh: () => Promise<void>;
  setUser: (u: User) => void;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUserState] = useState<User | null>(null);

  // Boot: read what we kept, then confirm it with the school if we can.
  useEffect(() => {
    let alive = true;
    (async () => {
      const [t, cached] = await Promise.all([
        getSecret(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);
      if (!alive) return;
      if (cached) {
        try {
          setUserState(JSON.parse(cached) as User);
        } catch {
          // A corrupted cache is not worth a crash on launch.
        }
      }
      setToken(t);
      setReady(true);

      // Confirm in the background. If the token died, this signs us out; if
      // the phone is offline, the cached user stands and nothing changes.
      if (t) {
        const r = await apiCall<{ user?: User }>("auth.php", { token: t });
        if (!alive) return;
        if (r.status === 401) {
          await clear();
        } else if (r.ok && r.data.user) {
          await keepUser(r.data.user);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const keepUser = useCallback(async (u: User) => {
    setUserState(u);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
  }, []);

  const clear = useCallback(async () => {
    setToken(null);
    setUserState(null);
    await Promise.all([
      deleteSecret(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
  }, []);

  const land = useCallback(
    async (data: { token?: string; user?: User }) => {
      if (!data.token || !data.user) return { ok: false, error: "The school sent no session." };
      await setSecret(TOKEN_KEY, data.token);
      setToken(data.token);
      await keepUser(data.user);
      return { ok: true };
    },
    [keepUser]
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const r = await apiCall<{ token?: string; user?: User; error?: string }>("auth.php", {
        method: "POST",
        body: { action: "login", email: email.trim().toLowerCase(), password },
      });
      if (!r.ok) return { ok: false, error: r.data.error ?? "Could not sign in." };
      return land(r.data);
    },
    [land]
  );

  const joinWaitlist = useCallback(async (email: string) => {
    const r = await apiCall<{ already?: boolean; error?: string }>("newsletter.php", {
      method: "POST",
      body: { email: email.trim().toLowerCase(), source: "app", school: "" },
    });
    if (!r.ok) return { ok: false, error: r.data.error ?? "Could not add that address." };
    return { ok: true, already: Boolean(r.data.already) };
  }, []);

  const requestReset = useCallback(async (email: string) => {
    const r = await apiCall<{ error?: string }>("auth.php", {
      method: "POST",
      body: { action: "request_reset", email: email.trim().toLowerCase() },
    });
    return r.ok ? { ok: true } : { ok: false, error: r.data.error ?? "Could not send that." };
  }, []);

  const resetPassword = useCallback(
    async (email: string, code: string, password: string) => {
      const r = await apiCall<{ error?: string }>("auth.php", {
        method: "POST",
        body: {
          action: "reset_password",
          email: email.trim().toLowerCase(),
          code: code.trim(),
          next: password,
        },
      });
      if (!r.ok) return { ok: false, error: r.data.error ?? "That code did not work." };
      // Changing the password kills every existing session server-side, this
      // one included, so the caller signs in again rather than being landed.
      return { ok: true };
    },
    []
  );

  const refresh = useCallback(async () => {
    if (!token) return;
    const r = await apiCall<{ user?: User }>("auth.php", { token });
    if (r.status === 401) await clear();
    else if (r.ok && r.data.user) await keepUser(r.data.user);
  }, [token, clear, keepUser]);

  const signOut = useCallback(async () => {
    if (token) {
      // Tell the server, but never make somebody wait on it to leave.
      void apiCall("auth.php", { method: "POST", token, body: { action: "logout" } });
    }
    await clear();
  }, [token, clear]);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      token,
      user,
      signIn,
      joinWaitlist,
      requestReset,
      resetPassword,
      signOut,
      refresh,
      setUser: (u: User) => void keepUser(u),
    }),
    [ready, token, user, signIn, joinWaitlist, requestReset, resetPassword, signOut, refresh, keepUser]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}
