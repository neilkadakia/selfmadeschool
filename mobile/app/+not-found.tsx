// A link to somewhere that is not here.
//
// Most likely a deep link to a unit that has since been renamed, so the way
// out is the desk rather than a back button that may have nothing behind it.

import { Link, Stack } from "expo-router";
import { View } from "react-native";
import { H1, P, Small } from "@/components/ui";
import { C, S } from "@/lib/theme";

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View style={{ flex: 1, backgroundColor: C.ink, padding: S.lg, justifyContent: "center", gap: S.md }}>
        <H1>That page is not here.</H1>
        <P muted>
          It may have been renamed, or the link may be older than the classroom it points at.
        </P>
        <Link href="/" style={{ marginTop: S.md }}>
          <Small tone={C.vio}>Back To The Desk</Small>
        </Link>
      </View>
    </>
  );
}
