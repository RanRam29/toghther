import { supabase } from "@/lib/supabase";

export interface AdminUserRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  area: string | null;
  suspended_at: string | null;
  created_at: string;
}

export interface AdminUserFilters {
  role?: "parent" | "professional" | "admin" | "supervisor" | "all";
  search?: string;
  suspendedOnly?: boolean;
}

export async function fetchAdminUsers(
  filters: AdminUserFilters = {},
): Promise<AdminUserRow[]> {
  let query = supabase
    .from("profiles")
    .select("id, full_name, phone, role, area, suspended_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters.role && filters.role !== "all") {
    query = query.eq("role", filters.role);
  }
  if (filters.suspendedOnly) {
    query = query.not("suspended_at", "is", null);
  }
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(
      `full_name.ilike.${term},phone.ilike.${term},area.ilike.${term}`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as AdminUserRow[];
}

export async function fetchAdminUser(
  userId: string,
): Promise<AdminUserRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, area, suspended_at, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as AdminUserRow | null;
}

export async function adminSuspendUser(
  userId: string,
  reason: string,
): Promise<void> {
  const { error } = await supabase.rpc("admin_suspend_user", {
    p_user_id: userId,
    p_reason: reason.trim(),
  });
  if (error) throw error;
}

export async function adminRestoreUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_restore_user", {
    p_user_id: userId,
  });
  if (error) throw error;
}

export interface AdminNoteRow {
  id: string;
  note: string;
  created_at: string;
  created_by: string;
}

export async function fetchAdminNotes(
  targetUserId: string,
): Promise<AdminNoteRow[]> {
  const { data, error } = await supabase
    .from("admin_notes" as "audit_log")
    .select("id, note, created_at, created_by")
    .eq("target_user_id" as "resource_id", targetUserId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.warn("[admin] notes unavailable:", error.message);
    return [];
  }
  return (data ?? []) as unknown as AdminNoteRow[];
}
