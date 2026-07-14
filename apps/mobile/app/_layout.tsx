import "react-native-reanimated";

import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AppProviders } from "@/components/providers/AppProviders";
import { usePushSetup } from "@/hooks/usePushSetup";

export default function RootLayout() {
  usePushSetup();

  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
    </AppProviders>
  );
}
