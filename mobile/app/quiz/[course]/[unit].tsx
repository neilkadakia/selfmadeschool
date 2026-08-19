// The knowledge check.
//
// Every answer books its next appearance: right climbs a Leitner box, wrong
// drops to the bottom. That is the whole reason the quiz exists. The score is
// a by-product; the schedule is the point.
//
// Options are shuffled per student per question, because the classroom's own
// audit found the correct answer sitting at B far too often. The shuffle is
// seeded so a student who backs out and returns sees the same order rather
// than a fresh puzzle.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Button, Card, H1, H2, Kicker, Loading, P, Problem, Small } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { getLesson, type QuizQuestion } from "@/lib/content";
import { questionKey, schedule, XP_MASTERED } from "@/lib/mastery";
import { addXp, recordQuiz, touchStreak } from "@/lib/progress";
import { useProgress } from "@/lib/store";
import { C, F, R, S } from "@/lib/theme";

/** A small deterministic hash, so an order is stable for one student. */
function seedFrom(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Fisher-Yates driven by the seed: same seed, same order, every time. */
function shuffled(options: string[], answer: number, seed: number) {
  const idx = options.map((_, i) => i);
  let x = seed || 1;
  for (let i = idx.length - 1; i > 0; i--) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    const j = Math.abs(x) % (i + 1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return {
    options: idx.map((i) => options[i]),
    answer: idx.indexOf(answer),
  };
}

type Shown = QuizQuestion & { shownOptions: string[]; shownAnswer: number };

export default function QuizScreen() {
  const { course, unit } = useLocalSearchParams<{ course: string; unit: string }>();
  const { token, user } = useAuth();
  const { edit, flush } = useProgress();
  const router = useRouter();

  const [raw, setRaw] = useState<QuizQuestion[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctCount, setCorrect] = useState(0);
  const [over, setOver] = useState(false);

  const load = useCallback(async () => {
    if (!token || !course || !unit) return;
    setErr(null);
    const r = await getLesson(token, course, unit);
    if (r.data) setRaw(r.data.quiz);
    else setErr(r.error ?? "That knowledge check would not open.");
  }, [token, course, unit]);

  useEffect(() => {
    void load();
  }, [load]);

  const questions = useMemo<Shown[]>(() => {
    if (!raw) return [];
    return raw.map((q, i) => {
      const seed = seedFrom(`${user?.email ?? "anon"}|${course}|${unit}|${i}`);
      const sh = shuffled(q.options, q.answer, seed);
      return { ...q, shownOptions: sh.options, shownAnswer: sh.answer };
    });
  }, [raw, user?.email, course, unit]);

  if (err) return <Problem title="Could not load that." detail={err} onRetry={load} />;
  if (!raw) return <Loading label="Fetching the questions" />;
  if (questions.length === 0) return <Problem title="This unit has no knowledge check." />;

  const q = questions[at];
  const answered = picked !== null;
  const right = answered && picked === q.shownAnswer;

  const choose = (i: number) => {
    if (answered) return;
    setPicked(i);
    const isRight = i === q.shownAnswer;
    if (isRight) setCorrect((n) => n + 1);
    void Haptics.notificationAsync(
      isRight ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
    );
    // Book the next appearance immediately: if the app dies here, the
    // schedule still learned something.
    const key = questionKey(course, unit, at);
    edit((s) => ({ ...s, mastery: { ...s.mastery, [key]: schedule(s.mastery[key], isRight) } }));
  };

  const next = async () => {
    if (at + 1 < questions.length) {
      setAt(at + 1);
      setPicked(null);
      return;
    }
    const score = correctCount;
    edit((s) => {
      let out = recordQuiz(touchStreak(s), course, unit, score);
      if (score === questions.length) out = addXp(out, 50);
      out = addXp(out, score * XP_MASTERED);
      return out;
    });
    await flush();
    setOver(true);
  };

  if (over) {
    const perfect = correctCount === questions.length;
    return (
      <ScrollView
        style={{ backgroundColor: C.ink }}
        contentContainerStyle={{ padding: S.lg, gap: S.lg }}
      >
        <Kicker tone={perfect ? C.acc : C.coral}>Knowledge Check</Kicker>
        <H1>
          {correctCount} out of {questions.length}.
        </H1>
        <P muted>
          {perfect
            ? "Clean sweep. Every one of these comes back later anyway, further apart each time you get it right."
            : "The ones you missed come back tomorrow. That is the whole system: you do not have to remember to review, the schedule remembers for you."}
        </P>
        <Button label="Back To The Unit" onPress={() => router.back()} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: C.ink }}
      contentContainerStyle={{ padding: S.lg, gap: S.md, paddingBottom: S.xxl }}
    >
      <Small>
        Question {at + 1} of {questions.length}
      </Small>
      <H2>{q.q}</H2>

      <View style={{ height: S.sm }} />

      {q.shownOptions.map((opt, i) => {
        const isAnswer = i === q.shownAnswer;
        const isMine = i === picked;
        return (
          <Pressable key={i} onPress={() => choose(i)} disabled={answered}>
            {({ pressed }) => (
              <View
                style={[
                  s.opt,
                  pressed && !answered && { borderColor: C.lineHi },
                  answered && isAnswer && s.optRight,
                  answered && isMine && !isAnswer && s.optWrong,
                ]}
              >
                <Text style={s.optText}>{opt}</Text>
              </View>
            )}
          </Pressable>
        );
      })}

      {answered && (
        <Card style={{ marginTop: S.sm }} tone={right ? C.acc : C.coral}>
          <Kicker tone={right ? C.acc : C.coral}>{right ? "Right" : "Not quite"}</Kicker>
          <P>{q.explain}</P>
        </Card>
      )}

      <View style={{ height: S.sm }} />
      <Button
        label={at + 1 < questions.length ? "Next Question" : "See How You Did"}
        onPress={next}
        disabled={!answered}
      />
    </ScrollView>
  );
}

const s = StyleSheet.create({
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
