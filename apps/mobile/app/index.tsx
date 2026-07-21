import { Redirect } from "expo-router";

import { hasStaffProfileRole, isStaffUser, staffHomeHref } from "@/lib/staff-auth";
import { isProfileComplete } from "@/lib/auth-api";
import { useAuthStore } from "@/stores/auth-store";

export default function Index() {
  const { session, profile, isHydrated } = useAuthStore();

  if (!isHydrated) return null;

  if (!session) return <Redirect href="/(auth)/login" />;

  if (!isProfileComplete(profile)) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  if (isStaffUser(session, profile) || hasStaffProfileRole(profile)) {
    return <Redirect href={staffHomeHref() as never} />;
  }
  if (profile?.role === "parent") return <Redirect href="/(parent)/(tabs)" />;
  if (profile?.role === "professional") return <Redirect href="/(professional)" />;

  return <Redirect href="/(auth)/role-select" />;
}
