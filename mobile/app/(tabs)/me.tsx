// You: the record, the settings, and the way out.
//
// The way out matters more than it looks. Apple's guideline 5.1.1(v) says an
// app that lets somebody create an account must let them delete it from inside
// the app, and the school's own privacy promise says the same thing in plainer
// words. Both point at the button at the bottom of this screen.

import { useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bar, Button, Card, Divider, H1, H2, Kicker, P, Small } from "@/components/ui";
import { apiCall } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { usDate } from "@/lib/format";
import { ladder, BOX_LABEL } from "@/lib/mastery";
import { levelFor, useProgress } from "@/lib/store";
import { C, F, S } from "@/lib/theme";

export default function Me() {
  const { user, token, signOut, refresh: refreshUser, setUser } = useAuth();
  const { state, offline, refresh } = useProgress();
  const insets = useSafeAreaInsets();

  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const level = levelFor(state.xp);
  const bars = ladder(state.mastery);
  const tracked = Object.keys(state.mastery).length;
  const unitsDone = Object.values(state.done).reduce((a, b) => a + b.length, 0);

  const pull = async () => {
    setBusy(true);
    await Promise.all([refresh(), refreshUser()]);
    setBusy(false);
  };

  const setNudges = async (off: boolean) => {
    if (!token || !user) return;
    setUser({ ...user, nudgesOff: off });
    await apiCall("auth.php", {
      method: "POST",
      token,
      body: { action: "set_prefs", nudgesOff: off },
    });
  };

  const setUnlisted = async (hidden: boolean) => {
    if (!token || !user) return;
    setUser({ ...user, unlisted: hidden });
    await apiCall("auth.php", {
      method: "POST",
      token,
      body: { action: "set_prefs", unlisted: hidden },
    });
  };

  // Deleting an account is not a thing to do behind one tap, and it is also
  // not a thing to make somebody email support about.
  const confirmDelete = () => {
    Alert.alert(
      "Delete your account?",
      "This removes your account, your progress, your posts and everything you have earned. It cannot be undone, and nobody at the school can put it back.",
      [
        { text: "Keep My Account", style: "cancel" },
        {
          text: "Delete Everything",
          style: "destructive",
          onPress: () =>
            Alert.alert(
              "Last check",
              "Really delete it? There is no undo.",
              [
                { text: "No" },
                { text: "Yes, Delete It", style: "destructive", onPress: () => void doDelete() },
              ]
            ),
        },
      ]
    );
  };

  const doDelete = async () => {
    if (!token) return;
    setBusy(true);
    const r = await apiCall<{ error?: string }>("auth.php", {
      method: "POST",
      token,
      body: { action: "delete_account", confirm: "DELETE" },
    });
    setBusy(false);
    if (r.ok) await signOut();
    else setNote(r.data.error ?? "Could not delete the account. Try again, or write to the school.");
  };

  return (
    <ScrollView
      style={{ backgroundColor: C.ink }}
      contentContainerStyle={{
        padding: S.lg,
        paddingTop: insets.top + S.lg,
        paddingBottom: S.xxl,
        gap: S.md,
      }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={pull} tintColor={C.acc} />}
    >
      <Kicker>Student File</Kicker>
      <H1>{user?.name ?? "You"}</H1>
      <Small>{user?.email}</Small>

      <Card style={{ marginTop: S.sm }}>
        <View style={t.stats}>
          <Stat n={String(state.xp)} label="XP" tone={C.acc} />
          <Stat n={String(unitsDone)} label="units" tone={C.vio} />
          <Stat n={String(state.streak.count)} label="day streak" tone={C.coral} />
        </View>
        <View style={{ height: S.md }} />
        <Bar pct={level.pct} />
        <View style={{ height: S.sm }} />
        <Small>
          {level.name}
          {level.next ? ` · ${(level.nextAt ?? 0) - state.xp} XP to ${level.next}` : ""}
        </Small>
      </Card>

      {tracked > 0 && (
        <Card>
          <Kicker>What You Know</Kicker>
          {bars.map((n, i) => (
            <View key={i} style={t.rung}>
              <Text style={t.rungName}>{BOX_LABEL[i]}</Text>
              <Text style={t.rungN}>{n}</Text>
            </View>
          ))}
          <View style={{ height: S.sm }} />
          <Small>{tracked} questions on the schedule.</Small>
        </Card>
      )}

      {state.badges.length > 0 && (
        <Card>
          <Kicker>Badges</Kicker>
          <Small>{state.badges.length} earned.</Small>
        </Card>
      )}

      {Object.keys(state.finals).length > 0 && (
        <Card>
          <Kicker>Finals</Kicker>
          {Object.entries(state.finals).map(([course, f]) => (
            <View key={course} style={{ marginTop: S.sm }}>
              <Text style={t.finalCourse}>{course}</Text>
              <Small tone={f.passed ? C.acc : C.coral}>
                {f.score} of {f.total} · {f.passed ? "passed" : "not yet"} · {usDate(f.date)}
              </Small>
            </View>
          ))}
        </Card>
      )}

      <Divider />

      <H2>Settings</H2>

      <Card>
        <Toggle
          label="School email"
          detail="Reminders about Office Hours and anything the school needs you to know. Bell notifications are separate and stay on."
          value={!user?.nudgesOff}
          onChange={(on) => void setNudges(!on)}
        />
        <View style={{ height: S.md }} />
        <Toggle
          label="Show me in the Register"
          detail="The student directory: your name, level and clubs. Turning this off takes you out of it and nothing else."
          value={!user?.unlisted}
          onChange={(on) => void setUnlisted(!on)}
        />
      </Card>

      {offline ? (
        <Small tone={C.coral}>
          Not connected. Settings changed now reach the school when you are back.
        </Small>
      ) : null}

      {note ? <Small tone={C.danger}>{note}</Small> : null}

      <View style={{ height: S.md }} />
      <Button label="Sign Out" kind="outline" onPress={() => void signOut()} />

      <View style={{ height: S.xl }} />
      <Card>
        <Kicker tone={C.danger}>Leaving</Kicker>
        <P muted>
          You can take your account and everything in it off the school's server whenever you want.
          It deletes your progress, your posts and your certificates with it, and there is no way
          to bring any of it back.
        </P>
        <View style={{ height: S.md }} />
        <Button label="Delete My Account" kind="outline" onPress={confirmDelete} busy={busy} />
      </Card>
    </ScrollView>
  );
}

function Stat({ n, label, tone }: { n: string; label: string; tone: string }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={[t.statN, { color: tone }]}>{n}</Text>
      <Text style={t.statL}>{label}</Text>
    </View>
  );
}

function Toggle({
  label,
  detail,
  value,
  onChange,
}: {
  label: string;
  detail: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={t.toggle}>
      <View style={{ flex: 1 }}>
        <Text style={t.toggleLabel}>{label}</Text>
        <Text style={t.toggleDetail}>{detail}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "rgba(242,238,227,0.16)", true: C.acc }}
        thumbColor={C.paper}
      />
    </View>
  );
}

const t = StyleSheet.create({
  stats: { flexDirection: "row" },
  statN: { fontFamily: F.display, fontSize: 26, letterSpacing: -0.5 },
  statL: { fontFamily: F.body, fontSize: 12, color: C.faint, marginTop: 2 },
  rung: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  rungName: { fontFamily: F.body, fontSize: 14, color: C.muted },
  rungN: { fontFamily: F.bodyBold, fontSize: 14, color: C.paper },
  finalCourse: { fontFamily: F.bodyBold, fontSize: 14.5, color: C.paper },
  toggle: { flexDirection: "row", alignItems: "flex-start", gap: S.md },
  toggleLabel: { fontFamily: F.bodyBold, fontSize: 15.5, color: C.paper },
  toggleDetail: { fontFamily: F.body, fontSize: 13, lineHeight: 19, color: C.faint, marginTop: 3 },
});
