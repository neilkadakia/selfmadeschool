// The Quad: clubs are rooms, each with its own feed and its own posting rule.
//
// Rooms open as in-page state rather than routes, the same choice the web
// classroom made. Here the reason is different: on a phone, a room is one tap
// in and one tap back, and a stack entry per room would put a student four
// screens deep in a conversation.

import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, Empty, H1, H2, Kicker, Loading, P, Pill, Small } from "@/components/ui";
import { apiCall } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { C, F, R, S, toneOf } from "@/lib/theme";

type Club = {
  id: string;
  name: string;
  blurb: string;
  tone: string;
  course: string;
  staffOnly: boolean;
  members: number;
  joined: boolean;
  open: boolean;
  posts: number;
};

type Comment = { id: string; name: string; text: string; created: string; mine: boolean; staff: boolean };

type Post = {
  id: string;
  name: string;
  text: string;
  kind?: string;
  created: string;
  pinned: boolean;
  mine?: boolean;
  reactions: Record<string, number>;
  yours: string[];
  comments: Comment[];
};

const REACTIONS: { key: string; label: string }[] = [
  { key: "like", label: "Like" },
  { key: "celebrate", label: "Celebrate" },
  { key: "insightful", label: "Insightful" },
  { key: "support", label: "Support" },
];

export default function Quad() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const [clubs, setClubs] = useState<Club[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const loadClubs = useCallback(async () => {
    if (!token) return;
    const r = await apiCall<{ clubs?: Club[] }>("quad.php?clubs=1", { token });
    setClubs(r.ok ? (r.data.clubs ?? []) : []);
  }, [token]);

  const loadRoom = useCallback(
    async (id: string) => {
      if (!token) return;
      const r = await apiCall<{ club?: Club; posts?: Post[]; error?: string }>(
        `quad.php?club=${encodeURIComponent(id)}`,
        { token }
      );
      if (r.ok) {
        setClub(r.data.club ?? null);
        setPosts(r.data.posts ?? []);
        setNote("");
      } else setNote(r.data.error ?? "That room would not open.");
    },
    [token]
  );

  useEffect(() => {
    void loadClubs();
  }, [loadClubs]);

  useEffect(() => {
    if (openId) void loadRoom(openId);
  }, [openId, loadRoom]);

  const act = async (body: Record<string, unknown>) => {
    if (!token) return;
    const r = await apiCall<{ error?: string }>("quad.php", { method: "POST", token, body });
    if (!r.ok) setNote(r.data.error ?? "That did not work.");
    if (openId) await loadRoom(openId);
    await loadClubs();
  };

  if (!clubs) return <Loading label="Walking over" />;

  // ---------- one room ----------
  if (openId && club) {
    return (
      <ScrollView
        style={{ backgroundColor: C.ink }}
        contentContainerStyle={{
          padding: S.lg,
          paddingTop: insets.top + S.lg,
          paddingBottom: S.xxl,
          gap: S.md,
        }}
        refreshControl={
          <RefreshControl
            refreshing={busy}
            onRefresh={async () => {
              setBusy(true);
              await loadRoom(openId);
              setBusy(false);
            }}
            tintColor={C.acc}
          />
        }
      >
        <Pressable onPress={() => { setOpenId(null); setClub(null); setPosts([]); }} hitSlop={10}>
          <Text style={t.back}>Back To The Quad</Text>
        </Pressable>

        <Kicker tone={toneOf(club.tone)}>{club.members} in the room</Kicker>
        <H1>{club.name}</H1>
        <P muted>{club.blurb}</P>

        {note ? <Small tone={C.danger}>{note}</Small> : null}

        {club.joined && !club.staffOnly && (
          <Card>
            <TextInput
              style={t.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Say something to the room."
              placeholderTextColor={C.ghost}
              multiline
              maxLength={2000}
            />
            <View style={{ height: S.sm }} />
            <Button
              label="Post It"
              disabled={!draft.trim()}
              onPress={async () => {
                await act({ action: "post", club: club.id, text: draft.trim() });
                setDraft("");
              }}
            />
          </Card>
        )}

        {!club.joined && (
          <Button label="Join This Room" onPress={() => void act({ action: "join", club: club.id })} />
        )}

        {posts.length === 0 && <Empty title="Nothing here yet.">Be the first to say something.</Empty>}

        {posts.map((p) => (
          <Card key={p.id} tone={p.pinned ? C.coral : undefined}>
            <View style={t.postTop}>
              <Text style={t.who}>{p.name}</Text>
              {p.pinned ? <Pill tone={C.coral}>Pinned</Pill> : null}
            </View>
            <View style={{ height: S.sm }} />
            <Text style={t.postText}>{p.text}</Text>

            <View style={{ height: S.md }} />
            <View style={t.reacts}>
              {REACTIONS.map((r) => {
                const n = p.reactions?.[r.key] ?? 0;
                const mine = p.yours?.includes(r.key);
                return (
                  <Pressable
                    key={r.key}
                    onPress={() => void act({ action: "react", id: p.id, reaction: r.key })}
                  >
                    <View style={[t.react, mine && { borderColor: C.acc }]}>
                      <Text style={[t.reactText, mine && { color: C.acc }]}>
                        {r.label}
                        {n > 0 ? ` ${n}` : ""}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {(p.comments ?? []).length > 0 && (
              <View style={{ marginTop: S.md, gap: S.sm }}>
                {p.comments.map((c) => (
                  <View key={c.id} style={t.comment}>
                    <Text style={t.commentWho}>
                      {c.name}
                      {c.staff ? " · faculty" : ""}
                    </Text>
                    <Text style={t.commentText}>{c.text}</Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        ))}
      </ScrollView>
    );
  }

  // ---------- the room list ----------
  return (
    <ScrollView
      style={{ backgroundColor: C.ink }}
      contentContainerStyle={{
        padding: S.lg,
        paddingTop: insets.top + S.lg,
        paddingBottom: S.xxl,
        gap: S.md,
      }}
      refreshControl={
        <RefreshControl
          refreshing={busy}
          onRefresh={async () => {
            setBusy(true);
            await loadClubs();
            setBusy(false);
          }}
          tintColor={C.acc}
        />
      }
    >
      <Kicker tone={C.vio}>The Quad</Kicker>
      <H1>Rooms, not a feed.</H1>
      <P muted>
        Everything anybody says here happens in a room the whole school can see. There is no
        private messaging, on purpose: it is what keeps this place worth being in.
      </P>

      {clubs.map((c) => (
        <Pressable key={c.id} onPress={() => c.open && setOpenId(c.id)} disabled={!c.open}>
          {({ pressed }) => (
            <View style={[t.room, pressed && c.open && { borderColor: C.lineHi }]}>
              <View style={[t.dot, { backgroundColor: toneOf(c.tone) }]} />
              <View style={{ flex: 1 }}>
                <View style={t.roomTop}>
                  <H2>{c.name}</H2>
                  {c.joined ? <Pill tone={toneOf(c.tone)}>In</Pill> : null}
                </View>
                <Small>{c.blurb}</Small>
                <View style={{ height: S.xs }} />
                <Small>
                  {c.members} {c.members === 1 ? "member" : "members"} · {c.posts}{" "}
                  {c.posts === 1 ? "post" : "posts"}
                  {c.staffOnly ? " · faculty post here" : ""}
                </Small>
                {!c.open ? (
                  <>
                    <View style={{ height: S.xs }} />
                    <Small tone={C.coral}>Opens with the course.</Small>
                  </>
                ) : null}
              </View>
            </View>
          )}
        </Pressable>
      ))}
    </ScrollView>
  );
}

const t = StyleSheet.create({
  back: { fontFamily: F.bodyMid, fontSize: 14.5, color: C.vio },
  room: {
    flexDirection: "row",
    gap: S.md,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: R.lg,
    padding: S.lg,
  },
  roomTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dot: { width: 10, height: 10, borderRadius: 99, marginTop: 7 },
  postTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  who: { fontFamily: F.bodyBold, fontSize: 14.5, color: C.paper },
  postText: { fontFamily: F.body, fontSize: 15.5, lineHeight: 23, color: C.paper },
  reacts: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
  react: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: R.pill,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  reactText: { fontFamily: F.bodyMid, fontSize: 12.5, color: C.faint },
  comment: { borderLeftWidth: 2, borderLeftColor: C.line, paddingLeft: S.md },
  commentWho: { fontFamily: F.bodyMid, fontSize: 12.5, color: C.faint },
  commentText: { fontFamily: F.body, fontSize: 14.5, lineHeight: 21, color: C.paper, marginTop: 2 },
  input: {
    color: C.paper,
    fontFamily: F.body,
    fontSize: 15.5,
    minHeight: 70,
    textAlignVertical: "top",
  },
});
