import { useEffect } from "react";
import type { Session } from "@supabase/supabase-js";

import { fetchProfile } from "@/lib/auth-api";
import { registerForPushNotificationsAsync } from "@/lib/push-notifications";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";

export function useAuthBootstrap() {
  const { setSession, setProfile, setHydrated, reset } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    async function hydrate(session: Session | null) {
      if (!mounted) return;
      setSession(session);

      if (session?.user) {
        try {
          const profile = await fetchProfile(session.user.id);
          if (mounted) setProfile(profile);
          // Register token silently if permissions were already granted
          registerForPushNotificationsAsync(session.user.id, true).catch((e) =>
            console.warn("Push token silent reg err:", e)
          );
        } catch (error) {
          console.warn("[auth] profile fetch failed:", error);
          if (mounted) setProfile(null);
        }
      } else {
        reset();
      }

      if (mounted) setHydrated(true);
    }

    if (!isSupabaseConfigured) {
      setHydrated(true);
      return;
    }

    supabase.auth.getSession().then(({ data }) => hydrate(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        await hydrate(session);
      }
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [reset, setHydrated, setProfile, setSession]);
}
