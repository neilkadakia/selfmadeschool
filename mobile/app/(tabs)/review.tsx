// Study Hall: what the schedule says is owed today.
//
// The queue is built from the student's own mastery map, and the questions
// themselves come from whatever is cached on the phone. That ordering matters:
// a review session must work on a train, so anything not downloaded is quietly
// left out of today's queue rather than turning the screen into an error.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Bar, Button, Card, Empty, H1, H2, Kicker, Loading, P, Small } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { getLesson, type QuizQuestion } from "@/lib/content";
import { BOX_DAYS, BOX_LABEL, dueKeys, ladder, nextDueDay, schedule, XP_MASTERED } from "@/lib/mastery";
import { addXp, touchStreak } from "@/lib/progress";
import { useProgress } from "@/lib/store";
import { C, F, R, S } from "@/lib/theme";
import { usDate } from "@/lib/format";

const SESSION_MAX = 12;

type Card = { key: string; course: string; unit: string; index: number; q: QuizQuestion };

export default function Review() {
  const { token } = useAuth();
  const { state, loaded, edit, flush } = useProgress();
  const insets = useSafeAreaInsets();

  const [queue, setQueue] = useState<Card[] | null>(null);
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const [over, setOver] = useState(false);

  // The session is fixed on the size of the history rather than on `loaded`
  // alone: for a signed-in student `loaded` flips on the local read, before
  // the server blob lands, and a list snapshotted then is empty all visit.
  const dueCount = useMemo(() => dueKeys(state.mastery).length, [state.mastery]);
  const trackedCount = Object.keys(state.mastery).length;

  const build = useCallback(async () => {
    if (!token || !loaded) return;
    const due = dueKeys(state.mastery).slice(0, SESSION_MAX);
    const wanted = Array.from(new Set(due.map((d) => `${d.course}/${d.unit}`)));
    const lessons = new Map<string, QuizQuestion[]>();
    for (const path of wanted) {
      const [c, u] = path.split("/");
      const r = await getLesson(token, c, u);
      if (r.data) lessons.set(path, r.data.quiz);
    }
    const rows: Card[] = [];
    for (const d of due) {
      const qs = lessons.get(`${d.course}/${d.unit}`);
      const q = qs?.[d.index];
      if (q) rows.push({ ...d, q });
    }
    setQueue(rows);
    setAt(0);
    setPicked(null);
    setRight(0);
    setOver(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, loaded, trackedCount, dueCount]);

  useEffect(() => {
    void build();
  }, [build]);

  const bars = ladder(state.mastery);
  const nextDay = nextDueDay(state.mastery);

  if (!loaded || queue === null) return <Loading label="Reading your schedule" />;

  const head = (
    <View style={{ gap: S.sm }}>
      <Kicker tone={C.coral}>Study Hall</Kicker>
      <H1>Nothing here is new.</H1>
      <P muted>
        Every question you have answered comes back on a schedule: one day, then three, seven,
        twenty-one, sixty, a hundred and eighty. Right climbs a step, wrong goes back to the
        bottom. Nothing ever retires, it just gets quieter.
      </P>
    </View>
  );

  const ladderCard = (
    <Card>
      <Kicker>The Ladder</Kicker>
      {BOX_DAYS.map((d, i) => {
        const n = bars[i] ?? 0;
        const most = Math.max(1, ...bars);
        return (
          <View key={i} style={s.rung}>
            <Text style={s.rungName}>{BOX_LABEL[i]}</Text>
            <View style={s.rungBar}>
              <Bar pct={(n / most) * 100} tone={i >= 4 ? C.acc : i >= 2 ? C.vio : C.coral} />
            </View>
            <Text style={s.rungN}>{n}</Text>
          </View>
        );
      })}
      <View style={{ height: S.sm }} />
      <Small>Every {BOX_DAYS.join(", ")} days, in order.</Small>
    </Card>
  );

  if (queue.length === 0) {
    return (
      <ScrollView
        style={{ backgroundColor: C.ink }}
        contentContainerStyle={{ padding: S.lg, paddingTop: insets.top + S.lg, gap: S.lg }}
      >
        {head}
        {trackedCount === 0 ? (
          <Empty title="Nothing to review yet.">
            Finish a knowledge check and its questions start showing up here on their own.
          </Empty>
        ) : (
          <Card tone={C.acc}>
            <H2>All caught up.</H2>
            <View style={{ height: S.sm }} />
            <Small>
              {nextDay ? `Next questions come due ${usDate(nextDay)}.` : "Nothing is scheduled."}
            </Small>
          </Card>
        )}
        {trackedCount > 0 ? ladderCard : null}
      </ScrollView>
    );
  }

  if (over) {
    return (
      <ScrollView
        style={{ backgroundColor: C.ink }}
        contentContainerStyle={{ padding: S.lg, paddingTop: insets.top + S.lg, gap: S.lg }}
      >
        <Kicker tone={C.acc}>Session Finished</Kicker>
        <H1>
          {right} of {queue.length}.
        </H1>
        <P muted>
          The ones you missed drop to the bottom of the ladder and come back tomorrow. The rest
          move up a step and get quieter.
        </P>
        <Button label="Done" onPress={() => void build()} />
        {ladderCard}
      </ScrollView>
    );
  }

  const card = queue[at];
  const answered = picked !== null;
  const isRight = answered && picked === card.q.answer;

  const choose = (i: number) => {
    if (answered) return;
    setPicked(i);
    const got = i === card.q.answer;
    if (got) setRight((n) => n + 1);
    void Haptics.notificationAsync(
      got ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
    );
    edit((s2) => ({
      ...s2,
      mastery: { ...s2.mastery, [card.key]: schedule(s2.mastery[card.key], got) },
    }));
  };

  const next = async () => {
    if (at + 1 < queue.length) {
      setAt(at + 1);
      setPicked(null);
      return;
    }
    edit((s2) => addXp(touchStreak({ ...s2, reviewLast: new Date().toISOString().slice(0, 10) }), right * XP_MASTERED));
    await flush();
    setOver(true);
  };

  return (
    <ScrollView
      style={{ backgroundColor: C.ink }}
      contentContainerStyle={{ padding: S.lg, paddingTop: insets.top + S.lg, gap: S.md, paddingBottom: S.xxl }}
    >
      <Small>
        {at + 1} of {queue.length} due today
      </Small>
      <H2>{card.q.q}</H2>
      <View style={{ height: S.sm }} />

      {card.q.options.map((opt, i) => (
        <Pressable key={i} onPress={() => choose(i)} disabled={answered}>
          {({ pressed }) => (
            <View
              style={[
                s.opt,
                pressed && !answered && { borderColor: C.lineHi },
                answered && i === card.q.answer && s.optRight,
                answered && i === picked && i !== card.q.answer && s.optWrong,
              ]}
            >
              <Text style={s.optText}>{opt}</Text>
            </View>
          )}
        </Pressable>
      ))}

      {answered && (
        <Card tone={isRight ? C.acc : C.coral} style={{ marginTop: S.sm }}>
          <Kicker tone={isRight ? C.acc : C.coral}>{isRight ? "Right" : "Not quite"}</Kicker>
          <P>{card.q.explain}</P>
        </Card>
      )}

      <View style={{ height: S.sm }} />
      <Button
        label={at + 1 < queue.length ? "Next" : "Finish The Session"}
        onPress={next}
        disabled={!answered}
      />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  rung: { flexDirection: "row", alignItems: "center", gap: S.sm, marginTop: S.sm },
  rungName: { fontFamily: F.body, fontSize: 13, color: C.muted, width: 92 },
  rungBar: { flex: 1 },
  rungN: { fontFamily: F.bodyBold, fontSize: 13, color: C.paper, width: 26, textAlign: "right" },
  opt: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: R.md,
    padding: S.md,
    minHeight: 54,
    justifyContent: "center",
  },
  optRight: { borderColor: C.acc, backgroundColor: "rgba(67, 222, 123, 0.12)" },
  optWrong: { borderColor: C.danger, backgroundColor: "rgba(255, 107, 107, 0.12)" },
  optText: { fontFamily: F.body, fontSize: 15.5, lineHeight: 22, color: C.paper },
});
