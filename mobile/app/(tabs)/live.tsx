// Live teaching: Office Hours, and time with an instructor on your own.
//
// Both halves are optional server-side, so this screen has to be right when
// either is switched off. A 404 from booking.php is not an error to show a
// student; it means the school does not do one-on-ones, and the section simply
// is not there.

import { useCallback, useEffect, useState } from "react";
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, Empty, H1, H2, Kicker, Loading, P, Pill, Small } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import {
  book,
  cancelBooking,
  cancelSeat,
  listSessions,
  listSlots,
  minutesAway,
  rsvp,
  whenLine,
  type Session,
  type Slot,
} from "@/lib/live";
import { C, F, R, S } from "@/lib/theme";

/** A session is joinable from ten minutes before it starts until it ends. */
function joinable(s: Session): boolean {
  const m = minutesAway(s.startsAt);
  return m <= 10 && m > -s.durationMin;
}

export default function Live() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [mine, setMine] = useState<Slot[]>([]);
  /** Null while unknown; false when the school has one-on-ones switched off. */
  const [oneOnOne, setOneOnOne] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [topicFor, setTopicFor] = useState<string | null>(null);
  const [topic, setTopic] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    const [a, b] = await Promise.all([listSessions(token), listSlots(token)]);
    setSessions(a.ok ? (a.data.sessions ?? []) : []);
    if (b.status === 404) {
      setOneOnOne(false);
      setSlots([]);
      setMine([]);
    } else {
      setOneOnOne(true);
      setSlots(b.ok ? (b.data.slots ?? []) : []);
      setMine(b.ok ? (b.data.mine ?? []) : []);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = async () => {
    setBusy(true);
    await load();
    setBusy(false);
  };

  const act = async (fn: () => Promise<{ ok: boolean; data: { error?: string } }>, said: string) => {
    setNote("");
    const r = await fn();
    setNote(r.ok ? said : (r.data.error ?? "That did not work."));
    await load();
  };

  if (!sessions) return <Loading label="Checking the timetable" />;

  return (
    <ScrollView
      style={{ backgroundColor: C.ink }}
      contentContainerStyle={{
        padding: S.lg,
        paddingTop: insets.top + S.lg,
        paddingBottom: S.xxl,
        gap: S.md,
      }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={refresh} tintColor={C.acc} />}
    >
      <Kicker tone={C.vio}>Live</Kicker>
      <H1>Real people, at a real time.</H1>
      <P muted>
        Office Hours is a room the whole class can sit in. A one-on-one is you and an instructor,
        for one thing you want to get straight.
      </P>

      {note ? <Small tone={C.acc}>{note}</Small> : null}

      {/* ---- Office Hours ---- */}
      <View style={{ marginTop: S.md }}>
        <H2>Office Hours</H2>
      </View>

      {sessions.length === 0 && (
        <Empty title="Nothing on the timetable yet.">
          When a session is scheduled it shows up here, and your phone rings before it starts.
        </Empty>
      )}

      {sessions.map((s) => {
        const seated = s.you === "in";
        const waiting = s.you === "waitlist";
        const full = s.seats >= s.capacity;
        const canJoin = seated && s.link && joinable(s);
        return (
          <Card key={s.id} tone={seated ? C.acc : C.vio}>
            <View style={t.top}>
              <Kicker tone={seated ? C.acc : C.vio}>{whenLine(s.startsAt)}</Kicker>
              {seated ? <Pill>Your seat</Pill> : waiting ? <Pill tone={C.coral}>Waitlist</Pill> : null}
            </View>
            <H2>{s.title}</H2>
            {s.blurb ? (
              <>
                <View style={{ height: S.sm }} />
                <Small>{s.blurb}</Small>
              </>
            ) : null}
            <View style={{ height: S.sm }} />
            <Small>
              {s.host ? `${s.host} · ` : ""}
              {s.durationMin} minutes · {s.seats} of {s.capacity} seats
              {s.waiting > 0 ? ` · ${s.waiting} waiting` : ""}
            </Small>

            <View style={{ height: S.md }} />

            {canJoin ? (
              <Button label="Join Now" onPress={() => void Linking.openURL(s.link as string)} />
            ) : seated || waiting ? (
              <Button
                label={waiting ? "Leave The Waitlist" : "Give Up My Seat"}
                kind="outline"
                onPress={() => void act(() => cancelSeat(token as string, s.id), waiting ? "Off the list." : "Seat given back.")}
              />
            ) : (
              <Button
                label={full ? "Join The Waitlist" : "Take A Seat"}
                tone={C.vio}
                onPress={() => void act(() => rsvp(token as string, s.id), full ? "You are on the waitlist." : "Seat saved.")}
              />
            )}

            {seated && !canJoin ? (
              <>
                <View style={{ height: S.sm }} />
                <Small>The join link appears here ten minutes before it starts.</Small>
              </>
            ) : null}
          </Card>
        );
      })}

      {/* ---- one-on-one ---- */}
      {oneOnOne && (
        <>
          <View style={{ marginTop: S.lg }}>
            <H2>One-on-one</H2>
          </View>

          {mine.map((sl) => (
            <Card key={sl.id} tone={C.coral}>
              <Kicker tone={C.coral}>Booked · {whenLine(sl.startsAt)}</Kicker>
              <H2>{sl.educatorName}</H2>
              <View style={{ height: S.sm }} />
              <Small>{sl.durationMin} minutes{sl.topic ? ` · ${sl.topic}` : ""}</Small>
              <View style={{ height: S.md }} />
              {sl.link && minutesAway(sl.startsAt) <= 10 ? (
                <Button label="Join Now" tone={C.coral} onPress={() => void Linking.openURL(sl.link as string)} />
              ) : (
                <Button
                  label="Cancel This"
                  kind="outline"
                  onPress={() => void act(() => cancelBooking(token as string, sl.id), "Given back.")}
                />
              )}
            </Card>
          ))}

          {mine.length === 0 && (slots ?? []).length === 0 && (
            <Empty title="No times are open right now.">
              Instructors post the hours they are free. Check back, or ask in The Quad.
            </Empty>
          )}

          {mine.length === 0 &&
            (slots ?? []).map((sl) => (
              <Card key={sl.id}>
                <Kicker>{whenLine(sl.startsAt)}</Kicker>
                <H2>{sl.educatorName}</H2>
                <View style={{ height: S.sm }} />
                <Small>{sl.durationMin} minutes, just you</Small>

                {topicFor === sl.id ? (
                  <>
                    <View style={{ height: S.md }} />
                    <Text style={t.label}>What do you want to get straight?</Text>
                    <TextInput
                      style={t.input}
                      value={topic}
                      onChangeText={setTopic}
                      placeholder="One sentence is plenty."
                      placeholderTextColor={C.ghost}
                      multiline
                      maxLength={400}
                    />
                    <View style={{ height: S.sm }} />
                    <Button
                      label="Book It"
                      onPress={() =>
                        void act(async () => {
                          const r = await book(token as string, sl.id, topic);
                          if (r.ok) {
                            setTopicFor(null);
                            setTopic("");
                          }
                          return r;
                        }, "Booked. Your instructor has been told.")
                      }
                    />
                    <View style={{ height: S.sm }} />
                    <Button label="Never Mind" kind="ghost" onPress={() => setTopicFor(null)} />
                  </>
                ) : (
                  <>
                    <View style={{ height: S.md }} />
                    <Button label="Book This Time" kind="outline" onPress={() => setTopicFor(sl.id)} />
                  </>
                )}
              </Card>
            ))}

          {mine.length > 0 && (
            <Small>One at a time. Cancel the one above to book a different hour.</Small>
          )}
        </>
      )}
    </ScrollView>
  );
}

const t = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  label: { fontFamily: F.bodyMid, fontSize: 13.5, color: C.muted, marginBottom: 6 },
  input: {
    backgroundColor: "rgba(242,238,227,0.04)",
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: R.md,
    padding: S.md,
    minHeight: 76,
    color: C.paper,
    fontFamily: F.body,
    fontSize: 15,
    textAlignVertical: "top",
  },
});
