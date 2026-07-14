import type { MatchRequest, TablesInsert } from "@toghther/shared";

import { supabase } from "@/lib/supabase";
import type { ChildMatch } from "@/lib/types";

export type ParentMatchRequest = MatchRequest & {
  professional: { display_name: string } | null;
};

export async function getMatchesForChild(
  childId: string,
  limit = 5,
): Promise<ChildMatch[]> {
  // Prefer the Edge Function (Claude-enriched match_reason) when available.
  const { data: fnData, error: fnError } = await supabase.functions.invoke(
    "calculate-matches",
    { body: { child_id: childId, limit } },
  );

  if (!fnError && fnData && Array.isArray((fnData as { matches?: unknown }).matches)) {
    return ((fnData as { matches: ChildMatch[] }).matches) ?? [];
  }

  // Fallback to direct RPC (still respects RLS).
  const { data, error } = await supabase.rpc("get_matches_for_child", {
    p_child_id: childId,
    p_limit: limit,
  });

  if (error) throw error;
  return data ?? [];
}

export async function fetchMatchRequestsForParent(
  childIds: string[],
): Promise<ParentMatchRequest[]> {
  if (childIds.length === 0) return [];

  const { data, error } = await supabase
    .from("match_requests")
    .select("*, professional:professionals(display_name)")
    .in("child_id", childIds)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as ParentMatchRequest[];
}

export async function createMatchRequest(
  input: Pick<
    TablesInsert<"match_requests">,
    | "child_id"
    | "professional_id"
    | "parent_message"
    | "score"
    | "match_reason"
  >,
): Promise<MatchRequest> {
  const { data, error } = await supabase
    .from("match_requests")
    .insert({
      ...input,
      initiated_by: "parent",
      tier_reached: 1,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function approveMatchRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc("approve_request", {
    p_request_id: requestId,
  });

  if (error) throw error;
}

export async function createMatchFromRequest(requestId: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_match_from_request", {
    p_request_id: requestId,
  });

  if (error) throw error;
  return data as string; // match_id
}

export async function declineAfterIntro(requestId: string, reason?: string): Promise<void> {
  const { error } = await supabase.rpc("decline_after_intro", {
    p_request_id: requestId,
    p_reason: reason,
  });

  if (error) throw error;
}

export async function rejectMatchRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc("reject_request", {
    p_request_id: requestId,
  });

  if (error) throw error;
}
