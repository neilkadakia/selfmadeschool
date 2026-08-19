// The desk.
//
// What a student sees when they open the app on a bus. The order is the point:
// what is owed today, then what they are in the middle of, then the shelf.
// Everything below the fold is optional; the top of this screen has to answer
// "what do I do right now" without being read.

import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bar, Button, CachedNote, Card, H1, H2, Kicker, Loading, P, Pill, Small } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { getShelf, type CourseRow } from "@/lib/content";
import { dueKeys } from "@/lib/mastery";
import { coursePct, levelFor, unitsDone, useProgress } from "@/lib/store";
import { C, F, R, S, toneOf } from "@/lib/theme";

function unitCount(c: CourseRow): number {
  return c.parts.reduce((n, p) => n + p.units.length, 0);
}

export default function Desk() {
  const { token, user } = useAuth();
  const { state, loaded, offline, refresh } = useProgress();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [shelf, setShelf] = useState<CourseRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (force = false) => {
      if (!token) return;
      const r = await getShelf(token, force);
      setShelf(r.data);
    },
    [token]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const onPull = useCallback(async () => {
    setBusy(true);
    await Promise.all([load(true), refresh()]);
    setBusy(false);
  }, [load, refresh]);

  const due = dueKeys(state.mastery);
  const level = levelFor(state.xp);
  const first = (user?.name ?? "").split(" ")[0] || "there";

  // What they are in the middle of: the first open course with something left.
  const current = (shelf ?? []).find((c) => {
    if (!c.access.open) return false;
    const total = unitCount(c);
    return total > 0 && unitsDone(state, c.slug).length < total;
  });

  const nextUnit = current
    ? current.order.find((slug) => !unitsDone(state, current.slug).includes(slug))
    : undefined;
  const nextTitle = current
    ? current.parts.flatMap((p) => p.units).find((u) => u.slug === nextUnit)?.title
    : undefined;

  if (!loaded || (!shelf && token)) return <Loading label="Opening the classroom" />;

  return (
    <ScrollView
      style={{ backgroundColor: C.ink }}
      contentContainerStyle={{
        padding: S.lg,
        paddingTop: insets.top + S.lg,
        paddingBottom: S.xxl,
        gap: S.lg,
      }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={onPull} tintColor={C.acc} />}
    >
      <View>
        <Kicker>The Classroom</Kicker>
        <H1>Good to see you, {first}.</H1>
      </View>

      {/* Only when we genuinely could not reach the school. Drawing from the
          cache is the normal path on every launch after the first, and saying
          so every time trains students to ignore the one message that matters. */}
      {offline && (
        <CachedNote>
          You are offline. This is the last thing the school told us, and anything you finish now
          syncs when you are back.
        </CachedNote>
      )}

      {/* The streak and the level, small: they are a reward, not the point. */}
      <Card>
        <View style={s.stats}>
          <Stat n={String(state.streak.count)} label={state.streak.count === 1 ? "day" : "days"} tone={C.coral} />
          <Stat n={String(state.xp)} label="XP" tone={C.acc} />
          <Stat n={String(Object.values(state.done).reduce((a, b) => a + b.length, 0))} label="units" tone={C.vio} />
        </View>
        <View style={{ height: S.md }} />
        <Bar pct={level.pct} tone={C.acc} />
        <View style={{ height: S.sm }} />
        <Small>
          {level.name}
          {level.next ? ` · ${(level.nextAt ?? 0) - state.xp} XP to ${level.next}` : " · top of the ladder"}
        </Small>
      </Card>

      {/* Owed today. This is the highest-value thing on the screen. */}
      {due.length > 0 && (
        <Card tone={C.coral}>
          <Kicker tone={C.coral}>Study Hall</Kicker>
          <H2>
            {due.length} {due.length === 1 ? "question is" : "questions are"} due.
          </H2>
          <View style={{ height: S.sm }} />
          <P muted>
            Five minutes now is worth an hour of re-reading later. Nothing here is new; it is all
            things you have already met.
          </P>
          <View style={{ height: S.md }} />
          <Button label="Start Review" tone={C.coral} onPress={() => router.push("/review")} />
        </Card>
      )}

      {/* Pick up where they left off. */}
      {current && nextUnit && (
        <Card tone={toneOf(current.tone)}>
          <Kicker tone={toneOf(current.tone)}>Pick Up Where You Left Off</Kicker>
          <H2>{nextTitle ?? "Your next unit"}</H2>
          <View style={{ height: S.sm }} />
          <Small>{current.title}</Small>
          <View style={{ height: S.md }} />
          <Bar pct={coursePct(state, current.slug, unitCount(current))} tone={toneOf(current.tone)} />
          <View style={{ height: S.sm }} />
          <Small>
            {unitsDone(state, current.slug).length} of {unitCount(current)} units finished
          </Small>
          <View style={{ height: S.md }} />
          <Button
            label="Open The Unit"
            tone={toneOf(current.tone)}
            onPress={() => router.push(`/unit/${current.slug}/${nextUnit}`)}
          />
        </Card>
      )}

      {/* The shelf. */}
      <View style={{ marginTop: S.sm }}>
        <H2>Your courses</H2>
      </View>

      {(shelf ?? []).map((c) => {
        const total = unitCount(c);
        const done = unitsDone(state, c.slug).length;
        const tone = toneOf(c.tone);
        return (
          <Card key={c.slug} tone={tone}>
            <View style={s.cardTop}>
              <Kicker tone={tone}>{c.kicker}</Kicker>
              {!c.access.open && <Pill tone={C.faint}>Locked</Pill>}
            </View>
            <H2>{c.title}</H2>
            <View style={{ height: S.sm }} />
            <Small>{c.headline}</Small>

            {c.access.open ? (
              <>
                <View style={{ height: S.md }} />
                <Bar pct={total ? Math.round((done / total) * 100) : 0} tone={tone} />
                <View style={{ height: S.sm }} />
                <Small>
                  {done} of {total} units
                </Small>
                <View style={{ height: S.md }} />
                <Button
                  label={done === 0 ? "Start This Course" : "Keep Going"}
                  kind="outline"
                  onPress={() => router.push(`/course/${c.slug}`)}
                />
              </>
            ) : (
              <>
                <View style={{ height: S.md }} />
                <Text style={s.locked}>
                  {c.access.reason === "prereq" && c.access.needs
                    ? `Finish ${c.access.needs.title} first. This one opens the day you do.`
                    : c.access.plan
                      ? `Part of ${c.access.plan.name}.`
                      : "Not open to you yet."}
                </Text>
              </>
            )}
          </Card>
        );
      })}
    </ScrollView>
  );
}

function Stat({ n, label, tone }: { n: string; label: string; tone: string }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={[s.statN, { color: tone }]}>{n}</Text>
      <Text style={s.statL}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  stats: { flexDirection: "row" },
  statN: { fontFamily: F.display, fontSize: 26, letterSpacing: -0.5 },
  statL: { fontFamily: F.body, fontSize: 12, color: C.faint, marginTop: 2 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  locked: {
    fontFamily: F.body,
    fontSize: 14,
    lineHeight: 21,
    color: C.faint,
    backgroundColor: "rgba(242,238,227,0.04)",
    borderRadius: R.sm,
    padding: S.md,
  },
});
