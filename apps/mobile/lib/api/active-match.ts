import type { Match } from "@toghther/shared";

import { supabase } from "@/lib/supabase";

export type ActiveMatch = Match & {
  child: { id: string; first_name: string } | null;
  professional: { id: string; display_name: string } | null;
};

export async function fetchActiveMatchForParent(
  parentId: string,
): Promise<ActiveMatch | null> {
  const { data, error } = await supabase
    .from("matches")
    .select(
      `*,
       child:children!inner(id, first_name, parent_id),
       professional:professionals(id, display_name)`,
    )
    .eq("status", "active")
    .eq("child.parent_id", parentId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as ActiveMatch | null;
}

export async function fetchActiveMatchForProfessional(
  professionalId: string,
): Promise<ActiveMatch | null> {
  const { data, error } = await supabase
    .from("matches")
    .select(
      `*,
       child:children(id, first_name),
       professional:professionals(id, display_name)`,
    )
    .eq("professional_id", professionalId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as ActiveMatch | null;
}


export async function pauseMatch(matchId: string): Promise<Match> {
  const { error } = await supabase.rpc("pause_match", { p_match_id: matchId });
  if (error) throw error;

  const { data, error: fetchError } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (fetchError) throw fetchError;
  return data;
}

export async function resumeMatch(matchId: string): Promise<Match> {
  const { error } = await supabase.rpc("resume_match", { p_match_id: matchId });
  if (error) throw error;

  const { data, error: fetchError } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (fetchError) throw fetchError;
  return data;
}

export async function endMatch(
  matchId: string,
  reason?: string,
): Promise<Match> {
  const { error } = await supabase.rpc("end_match", {
    p_match_id: matchId,
    ...(reason ? { p_reason: reason } : {}),
  });
  if (error) throw error;

  const { data, error: fetchError } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (fetchError) throw fetchError;
  return data;
}
