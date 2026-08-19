// The pieces every screen is built from.
//
// Kept in one file on purpose: it is the app's whole visual vocabulary, and a
// screen that needs something not in here should probably be using something
// that is.

import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { C, F, R, S } from "@/lib/theme";

// ---------- type ----------

export function H1({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <Text style={[t.h1, style as never]}>{children}</Text>;
}

export function H2({ children }: { children: ReactNode }) {
  return <Text style={t.h2}>{children}</Text>;
}

export function Kicker({ children, tone = C.acc }: { children: ReactNode; tone?: string }) {
  return <Text style={[t.kicker, { color: tone }]}>{children}</Text>;
}

export function P({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return <Text style={[t.p, muted && { color: C.muted }]}>{children}</Text>;
}

export function Small({ children, tone }: { children: ReactNode; tone?: string }) {
  return <Text style={[t.small, tone ? { color: tone } : null]}>{children}</Text>;
}

// ---------- surfaces ----------

export function Card({
  children,
  style,
  tone,
}: {
  children: ReactNode;
  style?: ViewStyle;
  /** A left rail in the course's colour, when a card belongs to a course. */
  tone?: string;
}) {
  return (
    <View style={[t.card, tone ? { borderLeftWidth: 3, borderLeftColor: tone } : null, style]}>
      {children}
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[t.row, style]}>{children}</View>;
}

export function Divider() {
  return <View style={t.divider} />;
}

// ---------- controls ----------

export function Button({
  label,
  onPress,
  kind = "solid",
  disabled,
  busy,
  tone = C.acc,
  style,
}: {
  label: string;
  onPress?: () => void;
  kind?: "solid" | "outline" | "ghost";
  disabled?: boolean;
  busy?: boolean;
  tone?: string;
  style?: ViewStyle;
}) {
  const off = disabled || busy;
  return (
    <Pressable
      onPress={off ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(off) }}
      style={({ pressed }) => [
        t.btn,
        kind === "solid" && { backgroundColor: tone },
        kind === "outline" && { borderWidth: 1, borderColor: C.lineHi },
        // A disabled button gets its own muted look rather than a faded green,
        // which reads as broken rather than as not-yet.
        off && (kind === "solid" ? { backgroundColor: C.cardHi } : { opacity: 0.5 }),
        pressed && !off && { transform: [{ scale: 0.985 }], opacity: 0.9 },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={kind === "solid" ? C.ink : C.paper} />
      ) : (
        <Text
          style={[
            t.btnText,
            kind === "solid" ? { color: off ? C.faint : C.ink } : { color: C.paper },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Pill({ children, tone = C.acc }: { children: ReactNode; tone?: string }) {
  return (
    <View style={[t.pill, { borderColor: tone }]}>
      <Text style={[t.pillText, { color: tone }]}>{children}</Text>
    </View>
  );
}

// ---------- states ----------

export function Loading({ label }: { label?: string }) {
  return (
    <View style={t.center}>
      <ActivityIndicator color={C.acc} />
      {label ? <Text style={[t.small, { marginTop: S.md }]}>{label}</Text> : null}
    </View>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <View style={t.empty}>
      <Text style={t.emptyTitle}>{title}</Text>
      {children ? <Text style={t.emptyBody}>{children}</Text> : null}
    </View>
  );
}

/** Something went wrong, said plainly, with a way out. */
export function Problem({
  title,
  detail,
  onRetry,
}: {
  title: string;
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={t.empty}>
      <Text style={t.emptyTitle}>{title}</Text>
      {detail ? <Text style={t.emptyBody}>{detail}</Text> : null}
      {onRetry ? (
        <Button label="Try Again" kind="outline" onPress={onRetry} style={{ marginTop: S.lg }} />
      ) : null}
    </View>
  );
}

/** The bar that says the phone is offline and the screen is from memory. */
export function CachedNote({ children }: { children: ReactNode }) {
  return (
    <View style={t.cached}>
      <Text style={t.cachedText}>{children}</Text>
    </View>
  );
}

// ---------- progress ----------

export function Bar({ pct, tone = C.acc }: { pct: number; tone?: string }) {
  const w = Math.max(0, Math.min(100, pct));
  return (
    <View style={t.barTrack}>
      <View style={[t.barFill, { width: `${w}%`, backgroundColor: tone }]} />
    </View>
  );
}

const t = StyleSheet.create({
  h1: {
    fontFamily: F.display,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.7,
    color: C.paper,
  },
  h2: {
    fontFamily: F.displayMid,
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: -0.3,
    color: C.paper,
  },
  kicker: {
    fontFamily: F.bodyBold,
    fontSize: 11.5,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: S.sm,
  },
  p: {
    fontFamily: F.body,
    fontSize: 16,
    lineHeight: 25,
    color: C.paper,
  },
  small: {
    fontFamily: F.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: C.faint,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    padding: S.lg,
  },
  row: { flexDirection: "row", alignItems: "center", gap: S.md },
  divider: { height: 1, backgroundColor: C.line, marginVertical: S.lg },
  btn: {
    minHeight: 50,
    borderRadius: R.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: S.lg,
  },
  btnText: { fontFamily: F.bodyBold, fontSize: 16 },
  pill: {
    borderWidth: 1,
    borderRadius: R.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  pillText: { fontFamily: F.bodyBold, fontSize: 11, letterSpacing: 0.4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: S.xl },
  empty: { padding: S.xl, alignItems: "center" },
  emptyTitle: {
    fontFamily: F.displayMid,
    fontSize: 18,
    color: C.paper,
    textAlign: "center",
  },
  emptyBody: {
    fontFamily: F.body,
    fontSize: 14.5,
    lineHeight: 22,
    color: C.faint,
    textAlign: "center",
    marginTop: S.sm,
  },
  cached: {
    backgroundColor: "rgba(255, 180, 58, 0.12)",
    borderColor: "rgba(255, 180, 58, 0.3)",
    borderWidth: 1,
    borderRadius: R.md,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
  },
  cachedText: { fontFamily: F.body, fontSize: 13, color: C.coral, lineHeight: 19 },
  barTrack: {
    height: 8,
    borderRadius: R.pill,
    backgroundColor: "rgba(242, 238, 227, 0.1)",
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: R.pill },
});
