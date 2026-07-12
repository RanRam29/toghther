import { useEffect } from "react";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";

import {
  getStoredPushToken,
  handleNotificationNavigation,
  registerForPushNotificationsAsync,
} from "@/lib/push-notifications";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";

export function usePushSetup() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    if (!isHydrated || !session) return;

    // Register token on setup
    registerForPushNotificationsAsync(session.user.id, true);

    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      // Foreground display is handled by setNotificationHandler in push-notifications.ts
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const { data: currentSession } = await supabase.auth.getSession();
        if (!currentSession.session) return;

        const data = response.notification.request.content.data as Record<
          string,
          unknown
        >;
        handleNotificationNavigation(data, router);
      },
    );

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data as Record<
        string,
        unknown
      >;
      handleNotificationNavigation(data, router);
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [isHydrated, session, router]);
}

export { getStoredPushToken };
