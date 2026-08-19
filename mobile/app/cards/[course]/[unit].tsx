// Flashcards.
//
// Tap to turn it over, then say whether you knew it. The self-report is the
// honest bit: a card you "sort of" knew is a card you did not know, and the
// deck is more useful when a student is allowed to admit that without it
// costing them anything.

import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Button, H1, Kicker, Loading, P, Problem, Small } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { getLesson, type Flashcard } from "@/lib/content";
import { addXp, touchStreak } from "@/lib/progress";
import { useProgress } from "@/lib/store";
import { C, F, R, S } from "@/lib/theme";

const XP_DECK = 25;

export default function CardsScreen() {
  const { course, unit } = useLocalSearchParams<{ course: string; unit: string }>();
  const { token } = useAuth();
  const { state, edit, flush } = useProgress();
  const router = useRouter();

  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [at, setAt] = useState(0);
  const [back, setBack] = useState(false);
  const [knew, setKnew] = useState(0);
  const [over, setOver] = useState(false);

  const load = useCallback(async () => {
    if (!token || !course || !unit) return;
    setErr(null);
    const r = await getLesson(token, course, unit);
    if (r.data) setCards(r.data.cards);
    else setErr(r.error ?? "That deck would not open.");
  }, [token, course, unit]);

  useEffect(() => {
    void load();
  }, [load]);

  if (err) return <Problem title="Could not load the deck." detail={err} onRetry={load} />;
  if (!cards) return <Loading label="Fetching the deck" />;
  if (cards.length === 0) return <Problem title="This unit has no flashcards." />;

  const key = `${course}/${unit}`;
  const already = state.decksDone.includes(key);

  const answer = async (got: boolean) => {
    if (got) setKnew((n) => n + 1);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (at + 1 < cards.length) {
      setAt(at + 1);
      setBack(false);
      return;
    }
    edit((s) => {
      const done = s.decksDone.includes(key) ? s.decksDone : [...s.decksDone, key];
      const out = touchStreak({ ...s, decksDone: done });
      return already ? out : addXp(out, XP_DECK);
    });
    await flush();
    setOver(true);
  };

  if (over) {
    return (
      <View style={s.done}>
        <Kicker>Deck Finished</Kicker>
        <H1>
          {knew} of {cards.length} known.
        </H1>
        <View style={{ height: S.md }} />
        <P muted>
          The ones you turned over and did not know are the ones worth running again tomorrow.
        </P>
        <View style={{ height: S.lg }} />
        <Button label="Run It Again" kind="outline" onPress={() => { setAt(0); setBack(false); setKnew(0); setOver(false); }} />
        <View style={{ height: S.sm }} />
        <Button label="Back To The Unit" onPress={() => router.back()} />
      </View>
    );
  }

  const card = cards[at];

  return (
    <View style={s.wrap}>
      <Small>
        Card {at + 1} of {cards.length}
      </Small>

      <Pressable style={s.cardTap} onPress={() => setBack((b) => !b)}>
        <View style={[s.card, back && s.cardBack]}>
          <Text style={s.face}>{back ? card.back : card.front}</Text>
          {!back ? <Text style={s.hint}>Tap to turn it over</Text> : null}
        </View>
      </Pressable>

      {back ? (
        <View style={{ gap: S.sm }}>
          <Button label="I Knew That" onPress={() => void answer(true)} />
          <Button label="Not Yet" kind="outline" onPress={() => void answer(false)} />
        </View>
      ) : (
        <Button label="Turn It Over" kind="outline" onPress={() => setBack(true)} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.ink, padding: S.lg, gap: S.md },
  done: { flex: 1, backgroundColor: C.ink, padding: S.lg, justifyContent: "center" },
  cardTap: { flex: 1 },
  card: {
    flex: 1,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: R.xl,
    padding: S.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: S.md,
  },
  cardBack: { borderColor: C.acc, backgroundColor: "rgba(67, 222, 123, 0.07)" },
  face: {
    fontFamily: F.displayMid,
    fontSize: 24,
    lineHeight: 33,
    color: C.paper,
    textAlign: "center",
  },
  hint: { fontFamily: F.body, fontSize: 13, color: C.ghost },
});
