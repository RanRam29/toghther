import { supabase } from "@/lib/supabase";

export interface AdminRequestRow {
  id: string;
  child_id: string;
  professional_id: string;
  status: string;
  created_at: string;
  initiated_by: string;
  child: { first_name: string; category: string } | null;
  professional: { display_name: string } | null;
}

export async function fetchAdminMatchRequests(): Promise<AdminRequestRow[]> {
  const { data, error } = await supabase
    .from("match_requests")
    .select(
      `
      id,
      child_id,
      professional_id,
      status,
      created_at,
      initiated_by,
      child:children(first_name, category),
      professional:professionals(display_name)
    `,
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as unknown as AdminRequestRow[];
}

export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export function isStuckRequest(row: AdminRequestRow): boolean {
  const age = daysSince(row.created_at);
  return (
    row.status === "expired" ||
    (row.status === "pending" && age >= 7) ||
    (row.status === "interested" && age >= 14)
  );
}
