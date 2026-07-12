import { supabase } from "@/lib/supabase";

export interface IntroContact {
  professional_id: string;
  display_name: string;
  phone: string | null;
}

export async function getIntroContact(
  requestId: string,
): Promise<IntroContact | null> {
  const { data, error } = await (supabase as any).rpc("get_intro_contact", {
    p_request_id: requestId,
  });

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return row as IntroContact;
}
