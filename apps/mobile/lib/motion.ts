import { AccessibilityInfo, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";

import { isWeb, supportsLayoutAnimations, supportsPressScale } from "@/lib/platform";

/** Default stagger step for list/card entrance animations (ms). */
export const STAGGER_MS = 80;

let reduceMotionEnabled: boolean | null = null;

export async function refreshReduceMotion(): Promise<boolean> {
  if (isWeb && typeof window !== "undefined") {
    try {
      reduceMotionEnabled = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      reduceMotionEnabled = false;
    }
    return reduceMotionEnabled;
  }

  try {
    reduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
  } catch {
    reduceMotionEnabled = false;
  }
  return reduceMotionEnabled;
}

export function isReduceMotionEnabled(): boolean {
  return reduceMotionEnabled ?? false;
}

/** Subscribe once at app start; call from AppProviders. */
export function bindReduceMotionListener(): () => void {
  if (isWeb && typeof window !== "undefined") {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      reduceMotionEnabled = mq.matches;
    };
    update();
    mq.addEventListener("change", update);
    void refreshReduceMotion();
    return () => mq.removeEventListener("change", update);
  }

  const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) => {
    reduceMotionEnabled = enabled;
  });
  void refreshReduceMotion();
  return () => sub.remove();
}

export function lightHaptic(): void {
  if (isWeb) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function successHaptic(): void {
  if (isWeb) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function staggerDelay(index: number, stepMs = STAGGER_MS): number {
  return index * stepMs;
}

/** Whether press-in/out scale animation should run on this platform. */
export function shouldAnimatePress(): boolean {
  return supportsPressScale && !isReduceMotionEnabled();
}

/** Reanimated entering animation — native only; web renders without layout animation. */
export function cardEntering(index = 0) {
  if (!supportsLayoutAnimations) return undefined;
  if (isReduceMotionEnabled()) {
    return FadeIn.duration(120);
  }
  return FadeInDown.delay(staggerDelay(index)).springify().damping(18);
}

/** Celebration entrance for LetterCard — native only. */
export function celebrateEntering(index = 0) {
  if (!supportsLayoutAnimations) return undefined;
  if (isReduceMotionEnabled()) {
    return FadeIn.duration(150);
  }
  return ZoomIn.delay(staggerDelay(index, 60)).springify().damping(14);
}

export const PRESS_SCALE = 0.97;
