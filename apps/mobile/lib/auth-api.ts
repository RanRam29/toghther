import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { toE164 } from "@/lib/phone";
import { toGeoPoint } from "@/lib/geo";
import type { FrameworkType, NeedCategory } from "@/lib/constants/child";
import type { AppLanguage, Profile, UserRole } from "@/lib/types";

export async function sendPhoneOtp(phone: string, role: UserRole) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Add credentials to .env");
  }

  const e164 = toE164(phone);
  if (!e164) {
    throw new Error("invalid_phone");
  }

  const { error } = await supabase.auth.signInWithOtp({
    phone: e164,
    options: {
      data: { role },
    },
  });

  if (error) throw error;
  return e164;
}

export async function verifyPhoneOtp(phone: string, token: string) {
  const e164 = toE164(phone);
  if (!e164) {
    throw new Error("invalid_phone");
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone: e164,
    token,
    type: "sms",
  });

  if (error) throw error;
  return data.session;
}

export async function signUpWithEmail(email: string, password: string, role: UserRole) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Add credentials to .env");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role },
    },
  });

  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Add credentials to .env");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data.session;
}

export async function requestPasswordReset(email: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Add credentials to .env");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "together://reset-password",
  });

  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Add credentials to .env");
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export interface BaseProfileInput {
  fullName: string;
  area: string;
  role: UserRole;
  language: AppLanguage;
  phone?: string;
}

export async function updateBaseProfile(
  userId: string,
  input: BaseProfileInput
): Promise<Profile> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .update({
      full_name: input.fullName.trim(),
      area: input.area.trim(),
      role: input.role,
      preferred_language: input.language,
      phone: input.phone?.trim() || (await supabase.auth.getUser()).data.user?.phone || null,
    })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return profile;
}

export interface ProfessionalOnboardingInput {
  displayName: string;
  bio?: string;
  specialties: NeedCategory[];
  experienceYears: number;
  frameworkTypes: FrameworkType[];
  city: { lng: number; lat: number };
}

export async function completeProfessionalOnboarding(
  userId: string,
  input: ProfessionalOnboardingInput
): Promise<void> {
  const { error } = await supabase.from("professionals").upsert(
    {
      user_id: userId,
      display_name: input.displayName.trim(),
      bio: input.bio?.trim() || null,
      specialties: input.specialties,
      experience_years: input.experienceYears,
      framework_types: input.frameworkTypes,
      location: toGeoPoint(input.city.lng, input.city.lat),
    },
    { onConflict: "user_id" }
  );

  if (error) throw error;
}

export interface ParentOnboardingInput {
  firstName: string;
  age: number;
  category: NeedCategory;
  secondaryCategory?: NeedCategory | null;
  functioningLevel: number;
  framework: FrameworkType;
  communicationVerbal: boolean;
  needs: Record<string, boolean>;
  city: { lng: number; lat: number };
  diagnosisFull?: string;
  notes?: string;
}

export async function completeParentOnboarding(
  parentId: string,
  input: ParentOnboardingInput
): Promise<string> {
  const { data: child, error: childError } = await supabase
    .from("children")
    .insert({
      parent_id: parentId,
      first_name: input.firstName.trim(),
      age: input.age,
      category: input.category,
      secondary_category: input.secondaryCategory ?? null,
      functioning_level: input.functioningLevel,
      framework: input.framework,
      communication_verbal: input.communicationVerbal,
      needs: input.needs,
      location: toGeoPoint(input.city.lng, input.city.lat),
      published: false,
    })
    .select("id")
    .single();

  if (childError) throw childError;

  const { error: detailsError } = await supabase.from("child_details").insert({
    child_id: child.id,
    full_name: input.firstName.trim(),
    diagnosis_full: input.diagnosisFull?.trim() || null,
    notes: input.notes?.trim() || null,
  });

  if (detailsError) throw detailsError;

  return child.id;
}

export function isProfileComplete(profile: Profile | null): boolean {
  return Boolean(profile?.full_name?.trim() && profile?.area?.trim());
}
