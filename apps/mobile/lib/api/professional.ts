import type {
  Child,
  MatchRequest,
  Professional,
  TablesUpdate,
} from "@toghther/shared";

import { supabase } from "@/lib/supabase";

export type ChildBasic = Pick<
  Child,
  | "id"
  | "first_name"
  | "age"
  | "category"
  | "secondary_category"
  | "framework"
  | "functioning_level"
  | "communication_verbal"
>;

const CHILD_BASIC_COLUMNS =
  "id, first_name, age, category, secondary_category, framework, functioning_level, communication_verbal";

export type IncomingRequest = MatchRequest & {
  child: ChildBasic | null;
};

export async function fetchMyProfessional(
  userId: string,
): Promise<Professional | null> {
  const { data, error } = await supabase
    .from("professionals")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateMyProfessional(
  userId: string,
  input: TablesUpdate<"professionals">,
): Promise<Professional> {
  const { data, error } = await supabase
    .from("professionals")
    .update(input)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function fetchIncomingRequests(
  professionalId: string,
): Promise<IncomingRequest[]> {
  const { data, error } = await supabase
    .from("match_requests")
    .select(`*, child:children(${CHILD_BASIC_COLUMNS})`)
    .eq("professional_id", professionalId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as IncomingRequest[];
}

export async function respondToRequest(
  requestId: string,
  status: "interested" | "rejected",
): Promise<MatchRequest> {
  // NOTE: RPC not yet reflected in generated types; cast until types regenerate.
  const { error } = await (supabase.rpc as unknown as (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ error: Error | null }>)("respond_to_request", {
    p_request_id: requestId,
    p_status: status,
  });

  if (error) throw error;

  const { data: request, error: fetchError } = await supabase
    .from("match_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (fetchError) throw fetchError;
  return request;
}

export async function fetchPublishedChildren(): Promise<ChildBasic[]> {
  // Query secure children_tier0 view (not in generated types yet).
  const client = supabase as unknown as {
    from: (name: string) => {
      select: (cols: string) => {
        order: (
          col: string,
          opts?: { ascending?: boolean },
        ) => Promise<{ data: unknown[] | null; error: Error | null }>;
      };
    };
  };

  const { data, error } = await client
    .from("children_tier0")
    .select(CHILD_BASIC_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as ChildBasic[];
}

export async function expressInterest(
  childId: string,
  professionalId: string,
): Promise<MatchRequest> {
  const { data, error } = await supabase
    .from("match_requests")
    .insert({
      child_id: childId,
      professional_id: professionalId,
      initiated_by: "professional",
      status: "interested",
      tier_reached: 1,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
