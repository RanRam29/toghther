import type { Session } from "@supabase/supabase-js";
import { Platform } from "react-native";

import type { Profile } from "@/lib/types";

/** Matches `public.is_admin()` — role + JWT app_metadata.is_admin. */
export function isAdminUser(
  session: Session | null | undefined,
  profile: Profile | null | undefined,
): boolean {
  if (!session?.user || !profile) return false;
  if (profile.role !== "admin") return false;
  return session.user.app_metadata?.is_admin === true;
}

/** D26 — מפקח אימות משלבות. Matches `public.is_supervisor()` — role + JWT app_metadata.is_supervisor. */
export function isSupervisorUser(
  session: Session | null | undefined,
  profile: Profile | null | undefined,
): boolean {
  if (!session?.user || !profile) return false;
  if (profile.role !== "supervisor") return false;
  return session.user.app_metadata?.is_supervisor === true;
}

/** מפקח או אדמין — גישה לאזור staff ולתור אימות. */
export function isStaffUser(
  session: Session | null | undefined,
  profile: Profile | null | undefined,
): boolean {
  return isAdminUser(session, profile) || isSupervisorUser(session, profile);
}

export function isStaffWebContext(): boolean {
  return Platform.OS === "web";
}

/** @deprecated use isStaffWebContext */
export const isAdminWebContext = isStaffWebContext;
