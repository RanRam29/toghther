import { I18nManager, Platform } from "react-native";

import type { AppLanguage } from "@/lib/types";
import { colors } from "@/lib/theme";

export const isWeb = Platform.OS === "web";
export const isNative = Platform.OS === "ios" || Platform.OS === "android";

/** Whether layout animations (Reanimated entering) are reliable on this platform. */
export const supportsLayoutAnimations = isNative;

/** Whether press-scale micro-interactions should run (skipped on web to avoid CSS conflicts). */
export const supportsPressScale = isNative;

export function isAppRtl(): boolean {
  if (isWeb && typeof document !== "undefined") {
    return document.documentElement.dir === "rtl";
  }
  return I18nManager.isRTL;
}

/** Sync `<html dir/lang>` on web — I18nManager alone does not always flip DOM direction. */
export function applyWebDocumentDirection(language: AppLanguage): void {
  if (!isWeb || typeof document === "undefined") return;
  const rtl = language === "he";
  document.documentElement.dir = rtl ? "rtl" : "ltr";
  document.documentElement.lang = language;
}

type TabBarStyle = {
  backgroundColor: string;
  borderTopColor: string;
  maxWidth?: number;
  width?: "100%";
  alignSelf?: "center";
  flexDirection?: "row" | "row-reverse";
};

/** Shared tab bar chrome — native relies on I18nManager; web needs explicit row-reverse in RTL. */
export function getTabBarStyle(options?: { wide?: boolean }): TabBarStyle {
  const base: TabBarStyle = {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
  };

  if (!isWeb) return base;

  return {
    ...base,
    ...(options?.wide
      ? { maxWidth: 1024, width: "100%", alignSelf: "center" }
      : {}),
    ...(isAppRtl() ? { flexDirection: "row-reverse" } : {}),
  };
}

/** Web-friendly pressable cursor. */
export const webPressableClass = isWeb ? "cursor-pointer" : "";
