// A course, part by part.
//
// Also where Take This Course Offline lives, because the moment a student
// decides to commit to a course is the moment worth asking whether they want
// it on the phone for the week.

import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { Bar, Button, Card, H1, H2, Kicker, Loading, P, Problem, Small } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { downloadCourse, downloadedUnits, getCourse, type CourseRow } from "@/lib/content";
import { unitsDone, useProgress } from "@/lib/store";
import { C, F, R, S, toneOf } from "@/lib/theme";

export default function CourseScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { token } = useAuth();
  const { state } = useProgress();
  const router = useRouter();
  const nav = useNavigation();

  const [course, setCourse] = useState<CourseRow | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [have, setHave] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");

  const load = useCallback(async () => {
    if (!token || !slug) return;
    setErr(null);
    const r = await getCourse(token, slug);
    if (r.data) {
      setCourse(r.data);
      const all = r.data.parts.flatMap((p) => p.units.map((u) => u.slug));
      setHave(await downloadedUnits(slug, all));
    } else setErr(r.error ?? "That course would not open.");
  }, [token, slug]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (course) nav.setOptions({ title: course.title });
  }, [nav, course]);

  const save = async () => {
    if (!token || !course) return;
    setSaving(true);
    setSaved("");
    const r = await downloadCourse(token, course.slug);
    setSaving(false);
    if (r.ok) {
      setSaved(`${r.units} units saved to this phone.`);
      const all = course.parts.flatMap((p) => p.units.map((u) => u.slug));
      setHave(await downloadedUnits(course.slug, all));
    } else setSaved(r.error ?? "Could not save that.");
  };

  if (err) return <Problem title="Could not open that course." detail={err} onRetry={load} />;
  if (!course) return <Loading label="Fetching the syllabus" />;

  const tone = toneOf(course.tone);
  const done = unitsDone(state, course.slug);
  const total = course.parts.reduce((n, p) => n + p.units.length, 0);

  return (
    <ScrollView
      style={{ backgroundColor: C.ink }}
      contentContainerStyle={{ padding: S.lg, paddingBottom: S.xxl, gap: S.md }}
    >
      <Kicker tone={tone}>{course.kicker}</Kicker>
      <H1>{course.headline}</H1>
      <P muted>{course.description}</P>

      <View style={{ height: S.sm }} />
      <Bar pct={total ? Math.round((done.length / total) * 100) : 0} tone={tone} />
      <Small>
        {done.length} of {total} units finished
      </Small>

      <View style={{ height: S.md }} />
      <Button
        label={
          have.size >= total && total > 0 ? "Saved On This Phone" : "Take This Course Offline"
        }
        kind="outline"
        busy={saving}
        disabled={have.size >= total && total > 0}
        onPress={save}
      />
      {saved ? <Small tone={C.acc}>{saved}</Small> : null}
      {have.size > 0 && have.size < total ? (
        <Small>
          {have.size} of {total} units are on this phone already.
        </Small>
      ) : null}

      {course.parts.map((part) => (
        <View key={part.id} style={{ marginTop: S.lg, gap: S.sm }}>
          <Kicker tone={toneOf(part.tone)}>{part.name}</Kicker>
          <Small>{part.tagline}</Small>
          <View style={{ height: S.xs }} />
          {part.units.map((u) => {
            const isDone = done.includes(u.slug);
            const offline = have.has(u.slug);
            return (
              <Pressable
                key={u.slug}
                onPress={() => u.taught && router.push(`/unit/${course.slug}/${u.slug}`)}
                disabled={!u.taught}
              >
                {({ pressed }) => (
                  <View style={[s.unit, pressed && u.taught && { borderColor: C.lineHi }]}>
                    <View
                      style={[
                        s.dot,
                        { backgroundColor: isDone ? toneOf(part.tone) : "rgba(242,238,227,0.2)" },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.unitTitle, !u.taught && { color: C.ghost }]}>{u.title}</Text>
                      {u.blurb ? <Text style={s.unitBlurb}>{u.blurb}</Text> : null}
                      {!u.taught ? <Text style={s.soon}>Being written</Text> : null}
                    </View>
                    {offline ? <Text style={s.offline}>saved</Text> : null}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}

      {done.length === total && total > 0 ? (
        <Card tone={C.acc} style={{ marginTop: S.lg }}>
          <Kicker>The Final</Kicker>
          <H2>Every unit is finished.</H2>
          <View style={{ height: S.sm }} />
          <P muted>
            The final is graded by the school rather than by this phone, so the certificate behind
            it means something. Take it in the classroom on the web for now.
          </P>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  unit: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: S.md,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: R.md,
    padding: S.md,
  },
  dot: { width: 10, height: 10, borderRadius: 99, marginTop: 6 },
  unitTitle: { fontFamily: F.bodyBold, fontSize: 15.5, color: C.paper, lineHeight: 21 },
  unitBlurb: { fontFamily: F.body, fontSize: 13.5, color: C.faint, lineHeight: 20, marginTop: 3 },
  soon: { fontFamily: F.body, fontSize: 12.5, color: C.ghost, marginTop: 4 },
  offline: { fontFamily: F.body, fontSize: 11, color: C.acc },
});
