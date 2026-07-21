import { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";

import {
  hasStaffProfileRole,
  isStaffUser,
  staffHomeHref,
} from "@/lib/staff-auth";
import { isProfileComplete } from "@/lib/auth-api";
import { useAuthStore } from "@/stores/auth-store";

type RouteGroup =
  | "(auth)"
  | "(parent)"
  | "(professional)"
  | "(active-match)"
  | "(staff)"
  | "(admin)";

const AUTH_SETUP_SCREENS = new Set([
  "role-select",
  "login",
  "verify-otp",
  "onboarding",
]);

function getRoleGroup(role: string | undefined): RouteGroup | null {
  if (role === "parent") return "(parent)";
  if (role === "professional") return "(professional)";
  if (role === "admin" || role === "supervisor") return "(staff)";
  return null;
}

export function useProtectedRoute() {
  const router = useRouter();
  const segments = useSegments() as string[];
  const { session, profile, isHydrated } = useAuthStore();

  useEffect(() => {
    if (!isHydrated) return;

    const rootSegment = segments[0];
    const subSegment = segments[1];
    const inAuthGroup = rootSegment === "(auth)";
    const roleGroup = getRoleGroup(profile?.role);
    const profileComplete = isProfileComplete(profile);
    const isStaff =
      isStaffUser(session, profile) || hasStaffProfileRole(profile);

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
      return;
    }

    if (session && profile === null) {
      return;
    }

    if (session && !profileComplete && subSegment !== "onboarding") {
      router.replace("/(auth)/onboarding");
      return;
    }

    if (session && profileComplete && inAuthGroup && AUTH_SETUP_SCREENS.has(subSegment ?? "")) {
      if (roleGroup === "(parent)") {
        router.replace("/(parent)/(tabs)");
      } else if (roleGroup === "(professional)") {
        router.replace("/(professional)");
      } else if (isStaff) {
        router.replace(staffHomeHref() as never);
      }
      return;
    }

    if (session && profileComplete && isStaff) {
      const inStaffGroup =
        rootSegment === "(staff)" || rootSegment === "(admin)";
      if (!inStaffGroup && !inAuthGroup) {
        router.replace(staffHomeHref() as never);
        return;
      }
    }

    if (session && profileComplete && roleGroup) {
      const inParentGroup = rootSegment === "(parent)";
      const inProfessionalGroup = rootSegment === "(professional)";
      const inStaffGroup =
        rootSegment === "(staff)" || rootSegment === "(admin)";

      if (roleGroup === "(parent)" && (inProfessionalGroup || inStaffGroup)) {
        router.replace("/(parent)/(tabs)");
        return;
      }
      if (roleGroup === "(professional)" && (inParentGroup || inStaffGroup)) {
        router.replace("/(professional)");
        return;
      }
      if (isStaff && (inParentGroup || inProfessionalGroup)) {
        router.replace(staffHomeHref() as never);
        return;
      }
    }

    if (
      session &&
      profileComplete &&
      (rootSegment === "(staff)" || rootSegment === "(admin)") &&
      !isStaff
    ) {
      if (profile?.role === "parent") {
        router.replace("/(parent)/(tabs)");
      } else if (profile?.role === "professional") {
        router.replace("/(professional)");
      } else {
        router.replace("/(auth)/role-select");
      }
    }
  }, [session, profile, segments, isHydrated, router]);
}
