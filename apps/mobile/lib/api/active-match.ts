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

/**
 * Approve a match request and atomically create the active match.
 * Uses the secure `approve_request` RPC (state-machine + audit).
 */
export async function approveAndCreateMatch(
  requestId: string,
): Promise<string> {
  const { data, error } = await (supabase.rpc as unknown as (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: Error | null }>)("approve_request", {
    p_request_id: requestId,
  });

  if (error) throw error;
  return data as string; // match_id
}

export async function endMatch(
  matchId: string,
  reason?: string,
): Promise<Match> {
  const { data, error } = await supabase
    .from("matches")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
      end_reason: reason ?? null,
    })
    .eq("id", matchId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
