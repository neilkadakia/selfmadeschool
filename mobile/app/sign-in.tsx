// Getting in.
//
// The school does not have open registration: accounts are made by the front
// office, and the public door is the waitlist. So this screen offers three
// honest things rather than a Join button that would fail: sign in, ask for a
// reset code, or put your address on the list.

import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H1, P, Small } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { C, F, R, S } from "@/lib/theme";

type Mode = "in" | "forgot" | "code" | "waitlist";

export default function SignIn() {
  const { signIn, requestReset, resetPassword, joinWaitlist } = useAuth();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, done: () => void) => {
    setBusy(true);
    setErr("");
    setMsg("");
    const r = await fn();
    setBusy(false);
    if (r.ok) done();
    else setErr(r.error ?? "That did not work.");
  };

  const go = () => {
    if (mode === "in") {
      void run(() => signIn(email, password), () => {});
    } else if (mode === "forgot") {
      void run(
        () => requestReset(email),
        () => {
          setMode("code");
          setMsg("If that address has an account, a code is on its way. It expires in an hour.");
        }
      );
    } else if (mode === "code") {
      void run(
        () => resetPassword(email, code, next),
        () => {
          setMode("in");
          setPassword("");
          setMsg("Password changed. Sign in with the new one.");
        }
      );
    } else {
      void run(
        async () => {
          const r = await joinWaitlist(email);
          if (r.ok) setMsg(r.already ? "You are already on the list." : "You are on the list.");
          return r;
        },
        () => {}
      );
    }
  };

  const label =
    mode === "in"
      ? "Sign In"
      : mode === "forgot"
        ? "Send Me A Code"
        : mode === "code"
          ? "Set The New Password"
          : "Join The Waitlist";

  const canGo =
    mode === "in"
      ? email.trim() !== "" && password !== ""
      : mode === "code"
        ? code.trim() !== "" && next.length >= 10
        : email.trim() !== "";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.ink }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          s.wrap,
          { paddingTop: insets.top + S.xxl, paddingBottom: insets.bottom + S.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.mark}>SELF MADE SCHOOL</Text>
        <H1>
          {mode === "waitlist"
            ? "Get in line."
            : mode === "in"
              ? "Welcome back."
              : "Let's get you back in."}
        </H1>
        <View style={{ height: S.md }} />
        <P muted>
          {mode === "in"
            ? "The classroom, your streak, and everything you have finished, on the phone you already carry."
            : mode === "forgot"
              ? "Tell us the address on your account and we will send a code to it."
              : mode === "code"
                ? "Enter the code from the email, then choose a new password of at least ten characters."
                : "The school opens in groups rather than all at once. Leave your address and you will hear when a seat is free."}
        </P>

        <View style={{ height: S.xl }} />

        {mode !== "code" && (
          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoComplete="email"
          />
        )}

        {mode === "in" && (
          <Field
            label="Password"
            value={password}
            onChange={setPassword}
            placeholder="Your password"
            secure
            autoComplete="current-password"
          />
        )}

        {mode === "code" && (
          <>
            <Field
              label="The code from the email"
              value={code}
              onChange={setCode}
              placeholder="123456"
              keyboardType="number-pad"
            />
            <Field
              label="New password"
              value={next}
              onChange={setNext}
              placeholder="At least ten characters"
              secure
              autoComplete="new-password"
            />
          </>
        )}

        {err ? <Text style={s.err}>{err}</Text> : null}
        {msg ? <Text style={s.msg}>{msg}</Text> : null}

        <View style={{ height: S.md }} />
        <Button label={label} onPress={go} busy={busy} disabled={!canGo} />

        <View style={{ height: S.xl }} />

        <View style={s.links}>
          {mode !== "in" && <Link onPress={() => setMode("in")}>Back To Sign In</Link>}
          {mode === "in" && <Link onPress={() => setMode("forgot")}>I Forgot My Password</Link>}
          {mode !== "waitlist" && <Link onPress={() => setMode("waitlist")}>I Need An Account</Link>}
        </View>

        {mode === "waitlist" ? (
          <View style={{ marginTop: S.xl }}>
            <Small>
              Nobody is sold anything here. The 13th Grade is free, and the address is used to tell
              you when a seat opens and nothing else.
            </Small>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  secure,
  keyboardType,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  secure?: boolean;
  keyboardType?: "email-address" | "number-pad";
  autoComplete?: "email" | "current-password" | "new-password";
}) {
  return (
    <View style={{ marginBottom: S.lg }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.ghost}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

function Link({ children, onPress }: { children: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10}>
      {({ pressed }) => <Text style={[s.link, pressed && { opacity: 0.6 }]}>{children}</Text>}
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: S.lg },
  mark: {
    fontFamily: F.bodyBold,
    fontSize: 11.5,
    letterSpacing: 2,
    color: C.acc,
    marginBottom: S.lg,
  },
  label: { fontFamily: F.bodyMid, fontSize: 13.5, color: C.muted, marginBottom: 6 },
  input: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: R.md,
    paddingHorizontal: S.md,
    minHeight: 50,
    color: C.paper,
    fontFamily: F.body,
    fontSize: 16,
  },
  err: {
    fontFamily: F.body,
    fontSize: 14,
    lineHeight: 21,
    color: C.danger,
    marginBottom: S.sm,
  },
  msg: {
    fontFamily: F.body,
    fontSize: 14,
    lineHeight: 21,
    color: C.acc,
    marginBottom: S.sm,
  },
  links: { gap: S.md },
  link: { fontFamily: F.bodyMid, fontSize: 15, color: C.vio },
});
