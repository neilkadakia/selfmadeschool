// The app's front door.
//
// Three things happen here and nothing else: the brand fonts load, the auth
// provider wraps everything, and a signed-out student is sent to the sign-in
// screen no matter which route they arrived on. Deep links to a unit therefore
// survive a cold start: you land on sign-in, and the router still has where
// you were going.

import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
} from "@expo-google-fonts/instrument-sans";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ProgressProvider } from "@/lib/store";
import { C } from "@/lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

function Gate() {
  const { ready, token } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const onSignIn = segments[0] === "sign-in";
    if (!token && !onSignIn) router.replace("/sign-in");
    else if (token && onSignIn) router.replace("/");
  }, [ready, token, segments, router]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: C.ink }} />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: C.ink },
        headerTintColor: C.paper,
        headerTitleStyle: { fontFamily: "Bricolage_700Bold", fontSize: 17 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: C.ink },
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="course/[slug]" options={{ title: "" }} />
      <Stack.Screen name="unit/[course]/[unit]" options={{ title: "" }} />
      <Stack.Screen name="quiz/[course]/[unit]" options={{ title: "Knowledge Check" }} />
      <Stack.Screen name="cards/[course]/[unit]" options={{ title: "Flashcards" }} />
      <Stack.Screen name="+not-found" options={{ title: "Not found" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Bricolage_800ExtraBold: BricolageGrotesque_800ExtraBold,
    Bricolage_700Bold: BricolageGrotesque_700Bold,
    Instrument_400Regular: InstrumentSans_400Regular,
    Instrument_500Medium: InstrumentSans_500Medium,
    Instrument_600SemiBold: InstrumentSans_600SemiBold,
  });

  // A font that will not load is not a reason to show nothing forever: the
  // system face is a worse day, not a broken app.
  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: C.ink }} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <ProgressProvider>
          <Gate />
        </ProgressProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
