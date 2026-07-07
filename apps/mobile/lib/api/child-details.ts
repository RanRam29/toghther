import type { ChildDetails, TablesInsert, TablesUpdate } from "@toghther/shared";

import { supabase } from "@/lib/supabase";

export async function fetchChildDetails(
  childId: string,
): Promise<ChildDetails | null> {
  const { data, error } = await supabase
    .from("child_details")
    .select("*")
    .eq("child_id", childId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertChildDetails(
  childId: string,
  input: Omit<TablesInsert<"child_details">, "child_id"> &
    Omit<TablesUpdate<"child_details">, "child_id">,
): Promise<ChildDetails> {
  const { data, error } = await supabase
    .from("child_details")
    .upsert(
      { child_id: childId, ...input },
      { onConflict: "child_id" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
