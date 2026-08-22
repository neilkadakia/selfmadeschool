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

    case "split":
      return (
        <View style={{ gap: S.sm }}>
          {b.title ? <H2>{b.title}</H2> : null}
          {b.rows.map((row, i) => (
            <View key={i} style={{ gap: S.sm }}>
              <View style={[s.splitCell, { borderLeftColor: C.coral }]}>
                <Kicker tone={C.coral}>{b.leftLabel}</Kicker>
                <Text style={s.splitText}>{row.left}</Text>
              </View>
              <View style={[s.splitCell, { borderLeftColor: C.acc }]}>
                <Kicker tone={C.acc}>{b.rightLabel}</Kicker>
                <Text style={s.splitText}>{row.right}</Text>
              </View>
            </View>
          ))}
        </View>
      );

    case "steps":
      return (
        <View style={{ gap: S.sm }}>
          {b.title ? <H2>{b.title}</H2> : null}
          {b.steps.map((step, i) => (
            <View key={i} style={s.step}>
              <Text style={s.stepN}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.stepLabel}>{step.label}</Text>
                <Small>{step.text}</Small>
              </View>
            </View>
          ))}
        </View>
      );

    // No SVG in this app, so a diagram arrives as the sentence it was written
    // to carry. That line is the same one a screen reader gets on the web.
    case "art":
      return (
        <Card tone={C.acc}>
          <Kicker tone={C.acc}>Diagram</Kicker>
          <P>{b.alt}</P>
          {b.caption ? <Small>{b.caption}</Small> : null}
        </Card>
      );

    // The six generic graphics. No SVG in this app, so each one is rebuilt
    // out of Views: a bar is a filled row, a scale is its own key list. The
    // numbers and the words are the whole content anyway.
    case "bars": {
      const max = Math.max(...b.items.map((i) => Math.abs(i.value)), 1);
      return (
        <View style={{ gap: S.md }}>
          {b.title ? <H2>{b.title}</H2> : null}
          {b.items.map((it, i) => (
            <View key={i} style={{ gap: 6 }}>
              <View style={s.gfxHead}>
                <Text style={s.gfxLabel}>{it.label}</Text>
                <Text style={[s.gfxValue, { color: gfxTone(it.tone) }]}>
                  {it.display ?? String(it.value)}
                </Text>
              </View>
              <View style={s.barTrack}>
                <View
                  style={[
                    s.barFill,
                    { width: `${Math.max(2, (Math.abs(it.value) / max) * 100)}%`, backgroundColor: gfxTone(it.tone) },
                  ]}
                />
              </View>
              {it.note ? <Small>{it.note}</Small> : null}
            </View>
          ))}
          {b.caption ? <Small>{b.caption}</Small> : null}
        </View>
      );
    }

    case "flow":
      return (
        <View style={{ gap: S.sm }}>
          {b.title ? <H2>{b.title}</H2> : null}
          {b.steps.map((st, i) => (
            <Card key={i} tone={gfxTone(b.tone)}>
              <Kicker tone={gfxTone(b.tone)}>{`Step ${i + 1}`}</Kicker>
              <Text style={s.gfxLabel}>{st.label}</Text>
              {st.note ? <Small>{st.note}</Small> : null}
            </Card>
          ))}
          {b.loop ? <Small>and round again</Small> : null}
          {b.caption ? <Small>{b.caption}</Small> : null}
        </View>
      );

    case "timeline":
      return (
        <View style={{ gap: S.sm }}>
          {b.title ? <H2>{b.title}</H2> : null}
          {b.points.map((pt, i) => (
            <View key={i} style={[s.splitCell, { borderLeftColor: gfxTone(pt.tone) }]}>
              <Kicker tone={gfxTone(pt.tone)}>{pt.at}</Kicker>
              <Text style={s.gfxLabel}>{pt.label}</Text>
              {pt.note ? <Small>{pt.note}</Small> : null}
            </View>
          ))}
          {b.caption ? <Small>{b.caption}</Small> : null}
        </View>
      );

    case "receipt":
      return (
        <Card>
          {b.title ? <Kicker tone={C.acc}>{b.title}</Kicker> : null}
          {b.lines.map((l, i) => (
            <View key={i} style={s.rcLine}>
              <View style={{ flex: 1 }}>
                <Text style={s.gfxLabel}>{l.label}</Text>
                {l.note ? <Small>{l.note}</Small> : null}
              </View>
              <Text style={[s.gfxValue, { color: gfxTone(l.tone) }]}>{l.value}</Text>
            </View>
          ))}
          {b.total ? (
            <View style={s.rcTotal}>
              <Text style={s.rcTotalLabel}>{b.total.label}</Text>
              <Text style={s.stat}>{b.total.value}</Text>
            </View>
          ) : null}
          {b.caption ? <Small>{b.caption}</Small> : null}
        </Card>
      );

    case "scale":
      return (
        <View style={{ gap: S.sm }}>
          {b.title ? <H2>{b.title}</H2> : null}
          <View style={s.gfxHead}>
            <Small>{b.left}</Small>
            <Small>{b.right}</Small>
          </View>
          {b.marks.map((m, i) => (
            <View key={i} style={s.scaleKey}>
              <View style={[s.scaleDot, { backgroundColor: gfxTone(m.tone) }]} />
              <Text style={s.bulletText}>{m.label}</Text>
            </View>
          ))}
          {b.caption ? <Small>{b.caption}</Small> : null}
        </View>
      );

    // A three-column table has nowhere to go on a phone, so each row becomes
    // its own card with the column names spelled out beside the values.
    case "table":
      return (
        <View style={{ gap: S.sm }}>
          {b.title ? <H2>{b.title}</H2> : null}
          {b.rows.map((row, i) => (
            <Card key={i}>
              <Kicker tone={C.acc}>{row[0]}</Kicker>
              {row.slice(1).map((cell, j) => (
                <View key={j} style={s.rcLine}>
                  <Text style={[s.bulletText, { flex: 1 }]}>{b.head[j + 1] ?? ""}</Text>
                  <Text style={[s.bulletText, { flex: 1, textAlign: "right" }]}>{cell}</Text>
                </View>
              ))}
            </Card>
          ))}
          {b.caption ? <Small>{b.caption}</Small> : null}
        </View>
      );

    case "divider":
      return <View style={s.rule} />;

    default:
      // A block kind this build does not know yet. Skip it rather than
      // showing a student an apology in the middle of a lesson.
      return null;
  }
}

/** Graphic tone to a colour. Plain and missing both mean the paper colour. */
function gfxTone(tone?: "good" | "warn" | "plain"): string {
  if (tone === "good") return C.acc;
  if (tone === "warn") return C.coral;
  return C.paper;
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
  splitCell: { borderLeftWidth: 3, paddingLeft: S.md, gap: 4 },
  splitText: { fontFamily: F.body, fontSize: 15, lineHeight: 23, color: C.paper },
  step: { flexDirection: "row", gap: S.md, marginTop: S.sm },
  stepN: {
    fontFamily: F.display,
    fontSize: 18,
    color: C.acc,
    width: 22,
    textAlign: "center",
  },
  stepLabel: { fontFamily: F.bodyBold, fontSize: 16, color: C.paper, marginBottom: 2 },
  gfxHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: S.md },
  gfxLabel: { fontFamily: F.bodyBold, fontSize: 15, color: C.paper },
  gfxValue: { fontFamily: F.display, fontSize: 17, color: C.paper },
  barTrack: { height: 12, borderRadius: 4, backgroundColor: C.card, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  rcLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: S.md,
    paddingVertical: S.sm,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  rcTotal: { marginTop: S.md, gap: 4 },
  rcTotalLabel: { fontFamily: F.bodyBold, fontSize: 12, color: C.muted, letterSpacing: 1.6 },
  scaleKey: { flexDirection: "row", alignItems: "center", gap: S.sm },
  scaleDot: { width: 12, height: 12, borderRadius: 6 },
  theLesson: { fontFamily: F.displayMid, fontSize: 19, lineHeight: 27, color: C.paper },
});
