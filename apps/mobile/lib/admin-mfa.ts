import { supabase } from "@/lib/supabase";

export function isMfaRequiredError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("aal2") || lower.includes("mfa");
}

export async function getAdminAssuranceLevel(): Promise<{
  currentLevel: string | null;
  nextLevel: string | null;
}> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return {
    currentLevel: data.currentLevel,
    nextLevel: data.nextLevel,
  };
}

export async function listMfaFactors() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return data;
}

export async function enrollTotpFactor() {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Together Admin",
  });
  if (error) throw error;
  return data;
}

export async function verifyTotpChallenge(factorId: string, code: string) {
  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) throw challengeError;

  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: code.trim(),
  });
  if (error) throw error;
  return data;
}
