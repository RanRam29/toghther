import { supabase } from "@/lib/supabase";

export interface AuditLogRow {
  id: string;
  user_id: string;
  resource: string;
  resource_id: string | null;
  action: string;
  tier: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLogFilters {
  action?: string;
  resource?: string;
  search?: string;
}

export async function fetchAuditLog(
  filters: AuditLogFilters = {},
): Promise<AuditLogRow[]> {
  let query = supabase
    .from("audit_log")
    .select("id, user_id, resource, resource_id, action, tier, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (filters.action?.trim()) {
    query = query.ilike("action", `%${filters.action.trim()}%`);
  }
  if (filters.resource?.trim()) {
    query = query.ilike("resource", `%${filters.resource.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  let rows = (data ?? []) as AuditLogRow[];
  if (filters.search?.trim()) {
    const term = filters.search.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.action.toLowerCase().includes(term) ||
        r.resource.toLowerCase().includes(term) ||
        r.user_id.toLowerCase().includes(term) ||
        (r.resource_id?.toLowerCase().includes(term) ?? false),
    );
  }
  return rows;
}
