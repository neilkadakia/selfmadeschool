// Five rooms, and no more. A tab bar is the one bit of an app a student never
// reads, so each of these is a place rather than a feature: what you are
// learning, what is owed, who is talking, what is live, and you.

import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { C, F } from "@/lib/theme";

/** Line icons, drawn with views: no icon font, nothing to fail to load. */
function Glyph({ name, on }: { name: string; on: boolean }) {
  const color = on ? C.acc : C.ghost;
  return (
    <View style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color, fontSize: 17, fontFamily: F.bodyBold }}>{name}</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.acc,
        tabBarInactiveTintColor: C.ghost,
        tabBarStyle: {
          backgroundColor: C.ink,
          borderTopColor: C.line,
          borderTopWidth: 1,
          height: 84,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontFamily: F.bodyMid, fontSize: 11, marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Desk",
          tabBarIcon: ({ focused }) => <Glyph name="◉" on={focused} />,
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: "Study Hall",
          tabBarIcon: ({ focused }) => <Glyph name="◈" on={focused} />,
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: "Live",
          tabBarIcon: ({ focused }) => <Glyph name="◐" on={focused} />,
        }}
      />
      <Tabs.Screen
        name="quad"
        options={{
          title: "The Quad",
          tabBarIcon: ({ focused }) => <Glyph name="◎" on={focused} />,
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: "Me",
          tabBarIcon: ({ focused }) => <Glyph name="◍" on={focused} />,
        }}
      />
    </Tabs>
  );
}
