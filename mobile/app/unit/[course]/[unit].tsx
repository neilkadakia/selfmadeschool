// A unit, read on a phone.
//
// This is the screen the whole app exists for, so it renders every block kind
// the curriculum can contain rather than the four easy ones. A block type this
// does not know is skipped silently: a student should never see the word
// "unsupported" in a lesson.
//
// Finishing is deliberately a button rather than a scroll position. Scrolling
// to the bottom means the text went past, not that it went in.

import { useCallback, useEffect, useState } from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { Button, Card, H1, H2, Kicker, Loading, P, Problem, Small } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { getLesson, type Lesson, type LessonBlock } from "@/lib/content";
import { addXp, markDone, touchStreak } from "@/lib/progress";
import { unitsDone, useProgress } from "@/lib/store";
import { C, F, R, S } from "@/lib/theme";

const XP_UNIT = 100;

export default function UnitScreen() {
  const { course, unit } = useLocalSearchParams<{ course: string; unit: string }>();
  const { token } = useAuth();
  const { state, edit, flush } = useProgress();
  const router = useRouter();
  const nav = useNavigation();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !course || !unit) return;
    setErr(null);
    const r = await getLesson(token, course, unit);
    if (r.data) setLesson(r.data);
    else setErr(r.error ?? "That unit would not open.");
  }, [token, course, unit]);

  useEffect(() => {
    void load();
  }, [load]);

  const done = unitsDone(state, course ?? "").includes(unit ?? "");

  useEffect(() => {
    nav.setOptions({ title: done ? "Finished" : "" });
  }, [nav, done]);

  const finish = async () => {
    if (done) return;
    edit((s) => addXp(touchStreak(markDone(s, course, unit)), XP_UNIT));
    await flush();
    router.back();
  };

  if (err) return <Problem title="Could not open that unit." detail={err} onRetry={load} />;
  if (!lesson) return <Loading label="Fetching the unit" />;

  return (
    <ScrollView
      style={{ backgroundColor: C.ink }}
      contentContainerStyle={{ padding: S.lg, paddingBottom: S.xxl * 2, gap: S.md }}
    >
      <Kicker>{done ? "Finished" : "This Unit"}</Kicker>
      <H1>{lesson.hook}</H1>

      <View style={{ height: S.sm }} />

      {lesson.blocks.map((b, i) => (
        <Block key={i} block={b} />
      ))}

      {lesson.takeaways && lesson.takeaways.length > 0 && (
        <Card style={{ marginTop: S.lg }}>
          <Kicker>Key Takeaways</Kicker>
          {lesson.takeaways.map((t, i) => (
            <View key={i} style={s.bullet}>
              <Text style={s.bulletDot}>—</Text>
              <Text style={s.bulletText}>{t}</Text>
            </View>
          ))}
        </Card>
      )}

      {lesson.theLesson ? (
        <Card tone={C.acc} style={{ marginTop: S.sm }}>
          <Kicker>The Lesson</Kicker>
          <Text style={s.theLesson}>{lesson.theLesson}</Text>
        </Card>
      ) : null}

      {lesson.action ? (
        <Card tone={C.coral} style={{ marginTop: S.sm }}>
          <Kicker tone={C.coral}>Field Work</Kicker>
          <P>{lesson.action}</P>
        </Card>
      ) : null}

      <View style={{ height: S.lg }} />

      {lesson.quiz.length > 0 && (
        <Button
          label="Take The Knowledge Check"
          kind="outline"
          onPress={() => router.push(`/quiz/${course}/${unit}`)}
        />
      )}
      {lesson.cards.length > 0 && (
        <Button
          label="Run The Flashcards"
          kind="outline"
          onPress={() => router.push(`/cards/${course}/${unit}`)}
        />
      )}

      <View style={{ height: S.sm }} />

      {done ? (
        <Card>
          <Small tone={C.acc}>You finished this one. It still counts in Study Hall.</Small>
        </Card>
      ) : (
        <Button label="I Have Finished This Unit" onPress={finish} />
      )}
    </ScrollView>
  );
}

function Block({ block: b }: { block: LessonBlock }) {
  switch (b.kind) {
    case "p":
      return <P>{b.text}</P>;

    case "h":
      return (
        <View style={{ marginTop: S.lg }}>
          <H2>{b.text}</H2>
        </View>
      );

    case "callout":
      return (
        <Card tone={C.vio}>
          <Kicker tone={C.vio}>{b.title}</Kicker>
          <P>{b.text}</P>
        </Card>
      );

    case "bigfact":
      return (
        <Card>
          <Text style={s.stat}>{b.stat}</Text>
          <Small>{b.caption}</Small>
        </Card>
      );

    case "list":
      return (
        <View style={{ gap: S.sm }}>
          {b.title ? <H2>{b.title}</H2> : null}
          {b.items.map((it, i) => (
            <View key={i} style={s.bullet}>
              <Text style={s.bulletDot}>—</Text>
              <Text style={s.bulletText}>{it}</Text>
            </View>
          ))}
        </View>
      );

    case "example":
      return (
        <Card>
          <Kicker tone={C.coral}>{b.title}</Kicker>
          <P>{b.text}</P>
        </Card>
      );

    case "quote":
      return (
        <View style={s.quote}>
          <Text style={s.quoteText}>{b.text}</Text>
          {b.who ? <Small>{b.who}</Small> : null}
        </View>
      );

    case "image":
      return (
        <View style={{ gap: S.sm }}>
          <Image
            source={{ uri: absolute(b.src) }}
            style={s.image}
            resizeMode="cover"
            accessibilityLabel={b.alt}
          />
          {b.caption ? <Small>{b.caption}</Small> : null}
        </View>
      );

    // Video and audio are links out for now rather than a half-working player:
    // an embedded frame that stalls is worse than a tap that opens something
    // that works. The player lands with the filmed units.
    case "video":
    case "embed":
    case "audio":
      return (
        <Pressable onPress={() => void Linking.openURL(absolute(b.src))}>
          <Card>
            <Kicker tone={C.vio}>{b.kind === "audio" ? "Listen" : "Watch"}</Kicker>
            <Text style={s.linkTitle}>
              {"title" in b && b.title ? b.title : "Open the recording"}
            </Text>
            {"caption" in b && b.caption ? <Small>{b.caption}</Small> : null}
          </Card>
        </Pressable>
      );

    case "file":
      return (
        <Pressable onPress={() => void Linking.openURL(absolute(b.href))}>
          <Card>
            <Kicker tone={C.coral}>Download</Kicker>
            <Text style={s.linkTitle}>{b.name}</Text>
            {b.note ? <Small>{b.note}</Small> : null}
          </Card>
        </Pressable>
      );

    case "divider":
      return <View style={s.rule} />;

    default:
      // A block kind this build does not know yet. Skip it rather than
      // showing a student an apology in the middle of a lesson.
      return null;
  }
}

/** Lesson assets are written as site-root paths; the app needs the whole URL. */
function absolute(src: string): string {
  if (/^https?:\/\//i.test(src)) return src;
  return `https://selfmadeschool.org${src.startsWith("/") ? "" : "/"}${src}`;
}

const s = StyleSheet.create({
  bullet: { flexDirection: "row", gap: S.sm, marginTop: 6 },
  bulletDot: { fontFamily: F.body, fontSize: 16, color: C.acc, lineHeight: 25 },
  bulletText: { flex: 1, fontFamily: F.body, fontSize: 16, lineHeight: 25, color: C.paper },
  stat: { fontFamily: F.display, fontSize: 38, color: C.acc, letterSpacing: -1 },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: C.coral,
    paddingLeft: S.md,
    gap: S.sm,
    marginVertical: S.sm,
  },
  quoteText: { fontFamily: F.body, fontSize: 18, lineHeight: 27, color: C.paper, fontStyle: "italic" },
  image: { width: "100%", height: 200, borderRadius: R.md, backgroundColor: C.card },
  linkTitle: { fontFamily: F.bodyBold, fontSize: 16, color: C.paper, marginBottom: 4 },
  rule: { height: 1, backgroundColor: C.line, marginVertical: S.lg },
  theLesson: { fontFamily: F.displayMid, fontSize: 19, lineHeight: 27, color: C.paper },
});
