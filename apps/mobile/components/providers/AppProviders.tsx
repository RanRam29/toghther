import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { ActivityIndicator, View, type ViewProps } from "react-native";
import {
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_700Bold,
} from "@expo-google-fonts/rubik";
import { useFonts } from "expo-font";
import { QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { GestureHandlerRootView as RNGestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import i18n, { initI18n } from "@/i18n";
import { queryClient } from "@/lib/query-client";
import { useAuthBootstrap } from "@/hooks/useAuthBootstrap";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { useLocaleStore } from "@/stores/auth-store";

const GestureHandlerRootView =
  RNGestureHandlerRootView as ComponentType<ViewProps & { children?: ReactNode }>;

function AppReady({ children }: { children: ReactNode }) {
  useAuthBootstrap();
  useProtectedRoute();
  return <>{children}</>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const language = useLocaleStore((s) => s.language);
  const [i18nReady, setI18nReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_700Bold,
  });

  useEffect(() => {
    initI18n(language).finally(() => setI18nReady(true));
  }, [language]);

  // Safety net: never block rendering forever if fonts fail to load (common on web) —
  // fall back to the system font after a short timeout instead of a perpetual splash.
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const fontsSettled = fontsLoaded || !!fontError || timedOut;

  if (!fontsSettled || !i18nReady) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator size="large" color="#534AB7" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>
            <AppReady>{children}</AppReady>
          </I18nextProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
