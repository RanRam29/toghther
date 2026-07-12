import { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import {
  canAccessProfessionalFeatures,
  isProfessionalVerified,
} from "@/lib/verification";
import { supabase } from "@/lib/supabase";
import { professionalQueryKey, useMyProfessional } from "@/hooks/useProfessional";
import { useAuthStore } from "@/stores/auth-store";
import { promptPushPermission } from "@/components/shared/PushPermissionProvider";

const ALLOWED_UNVERIFIED_SCREENS = new Set([
  "pending",
  "documents",
  "profile",
]);

/**
 * Redirects unverified professionals away from browse/requests/today.
 * Subscribes to realtime verification status changes.
 */
export function useVerificationGate() {
  const router = useRouter();
  const segments = useSegments() as string[];
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;

  const { data: professional } = useMyProfessional(userId);
  const isVerified = isProfessionalVerified(professional);
  const currentScreen = segments[segments.length - 1] ?? "";

  useEffect(() => {
    if (!userId || !professional) return;

    const channel = supabase
      .channel(`professional-verification-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "professionals",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({
            queryKey: professionalQueryKey(userId),
          });

          const nextStatus = (payload.new as { verified?: string }).verified;
          if (nextStatus === "verified") {
            void promptPushPermission(userId);
            router.replace("/(professional)" as never);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, professional, queryClient, router]);

  useEffect(() => {
    if (!professional || isVerified) return;
    if (ALLOWED_UNVERIFIED_SCREENS.has(currentScreen)) return;

    router.replace("/(professional)/pending" as never);
  }, [professional, isVerified, currentScreen, router]);

  return {
    professional,
    isVerified,
    canAccess: canAccessProfessionalFeatures(professional),
    verificationStatus: professional?.verified ?? "pending",
  };
}
