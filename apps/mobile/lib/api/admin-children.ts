import { supabase } from "@/lib/supabase";

/** TIER 0/1 only — no child_details (S-ADM-04). */
export interface AdminChildRow {
  id: string;
  parent_id: string;
  first_name: string;
  age: number;
  category: string;
  framework: string;
  functioning_level: number;
  published: boolean;
  created_at: string;
}

export async function fetchAdminChildren(): Promise<AdminChildRow[]> {
  const { data, error } = await supabase
    .from("children")
    .select(
      "id, parent_id, first_name, age, category, framework, functioning_level, published, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as AdminChildRow[];
}

export async function adminUnpublishChild(
  childId: string,
  reason: string,
): Promise<void> {
  const { error } = await supabase.rpc("admin_unpublish_child", {
    p_child_id: childId,
    p_reason: reason.trim(),
  });
  if (error) throw error;
}
