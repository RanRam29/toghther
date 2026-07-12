import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import type { Router } from "expo-router";

import { supabase } from "@/lib/supabase";

let lastRegisteredToken: string | undefined;

export function getStoredPushToken(): string | undefined {
  return lastRegisteredToken;
}

type NotificationData = Record<string, unknown>;

export function handleNotificationNavigation(
  data: NotificationData,
  router: Router,
): void {
  const type = data.type as string | undefined;
  if (!type) return;

  switch (type) {
    case "match_request":
    case "request_interested":
    case "request_declined":
    case "request_no_answer":
      router.push("/(professional)");
      break;
    case "match_created":
      if (typeof data.match_id === "string") {
        router.push({
          pathname: "/(active-match)",
          params: { matchId: data.match_id },
        });
      }
      break;
    case "checkin":
    case "daily_summary_ready":
    case "daily_log_reminder":
      if (typeof data.match_id === "string") {
        router.push({
          pathname: "/(active-match)",
          params: { matchId: data.match_id },
        });
      } else if (typeof data.log_id === "string") {
        router.push("/(active-match)");
      }
      break;
    case "review_request":
      if (typeof data.match_id === "string") {
        router.push({
          pathname: "/(active-match)/review",
          params: { matchId: data.match_id },
        });
      }
      break;
    case "professional_verified":
    case "professional_rejected":
      router.push("/(professional)/documents");
      break;
    case "document_rejected":
      router.push("/(professional)/documents");
      break;
    default:
      break;
  }
}

// Configure how notifications appear when the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(userId: string, silent: boolean = false): Promise<string | undefined> {
  let token: string | undefined;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#534AB7",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      if (silent) {
        return undefined; // Do not ask for permission in silent mode
      }
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      // Permission denied
      return undefined;
    }
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    if (!projectId) {
      console.warn("EAS projectId not found. Push notifications may not work.");
    }
    try {
      const pushTokenString = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
      token = pushTokenString;
    } catch (e: unknown) {
      console.warn("Error getting push token:", e);
    }
  } else {
    // Simulator
    return undefined;
  }

  if (token) {
    lastRegisteredToken = token;
    try {
      await (supabase as any).from("push_tokens").upsert(
        {
          user_id: userId,
          token: token,
          platform: Platform.OS,
        },
        { onConflict: "user_id,token" },
      );
    } catch (error) {
      console.error("Failed to save push token:", error);
    }
  }

  return token;
}

export async function removePushToken(userId: string, token: string): Promise<void> {
  try {
    await (supabase as any).from("push_tokens").delete().match({ user_id: userId, token: token });
  } catch (error) {
    console.error("Failed to remove push token:", error);
  }
}
