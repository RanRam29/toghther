import { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";
import { Platform } from "react-native";

import {
  isAdminUser,
  isStaffUser,
  isStaffWebContext,
  isSupervisorUser,
} from "@/lib/staff-auth";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Guards the (staff) route group: web-only + supervisor or admin.
 */
export function useStaffRoute() {
  const router = useRouter();
  const segments = useSegments() as string[];
  const { session, profile, isHydrated } = useAuthStore();

  const inStaffGroup = segments[0] === "(staff)";
  const currentScreen = segments[segments.length - 1] ?? "";
  const isWeb = isStaffWebContext();
  const isStaff = isStaffUser(session, profile);
  const isAdmin = isAdminUser(session, profile);
  const isSupervisor = isSupervisorUser(session, profile);

  useEffect(() => {
    if (!isHydrated || !inStaffGroup) return;

    if (!session) {
      router.replace("/(auth)/role-select");
      return;
    }

    if (!isStaff) {
      router.replace("/(auth)/role-select");
      return;
    }

    if (!isWeb && currentScreen !== "web-only") {
      router.replace("/(staff)/web-only" as never);
    }
  }, [
    isHydrated,
    inStaffGroup,
    session,
    isStaff,
    isWeb,
    currentScreen,
    router,
  ]);

  return {
    isReady: isHydrated,
    isStaff,
    isAdmin,
    isSupervisor,
    isWeb,
    userId: session?.user?.id,
    denied: isHydrated && inStaffGroup && (!session || !isStaff),
  };
}

/** @deprecated use useStaffRoute */
export const useAdminRoute = useStaffRoute;
