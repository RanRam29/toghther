import { supabase } from "@/lib/supabase";

export interface PlatformMetrics {
  verifiedProfessionals: number;
  pendingVerification: number;
  slaOverdue: number;
  activeParents: number;
  activeChildren: number;
  openRequests: number;
  activeMatches: number;
  checkinsToday: number;
  dailyLogsToday: number;
}

export interface ParentFunnel {
  parentsActivated: number;
  parentsViewedMatches: number;
  parentsSentRequest: number;
  parentsWithMatch: number;
  conversionToRequestPct: number;
  conversionToMatchPct: number;
}

export async function fetchPlatformMetrics(): Promise<PlatformMetrics> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const [
    verifiedRes,
    pendingRes,
    parentsRes,
    childrenRes,
    requestsRes,
    matchesRes,
    checkinsRes,
    logsRes,
    overdueRes,
  ] = await Promise.all([
    supabase
      .from("professionals")
      .select("*", { count: "exact", head: true })
      .eq("verified", "verified"),
    supabase
      .from("professionals")
      .select("*", { count: "exact", head: true })
      .eq("verified", "submitted"),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "parent"),
    supabase
      .from("children")
      .select("*", { count: "exact", head: true })
      .eq("published", true),
    supabase
      .from("match_requests")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "interested", "approved"]),
    supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("checkins")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayIso),
    supabase
      .from("daily_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayIso),
    supabase
      .from("professionals")
      .select("updated_at")
      .eq("verified", "submitted"),
  ]);

  const overdue =
    overdueRes.data?.filter((row) => {
      const days =
        (Date.now() - new Date(row.updated_at).getTime()) / (86400000);
      return days > 2;
    }).length ?? 0;

  return {
    verifiedProfessionals: verifiedRes.count ?? 0,
    pendingVerification: pendingRes.count ?? 0,
    slaOverdue: overdue,
    activeParents: parentsRes.count ?? 0,
    activeChildren: childrenRes.count ?? 0,
    openRequests: requestsRes.count ?? 0,
    activeMatches: matchesRes.count ?? 0,
    checkinsToday: checkinsRes.count ?? 0,
    dailyLogsToday: logsRes.count ?? 0,
  };
}

export async function fetchParentFunnel(): Promise<ParentFunnel | null> {
  const { data, error } = await supabase
    .from("view_parent_funnel" as "profiles")
    .select("*")
    .maybeSingle();

  if (error) {
    console.warn("[dashboard] funnel view unavailable:", error.message);
    return null;
  }

  const row = data as Record<string, number> | null;
  if (!row) return null;

  return {
    parentsActivated: Number(row.parents_activated ?? 0),
    parentsViewedMatches: Number(row.parents_viewed_matches ?? 0),
    parentsSentRequest: Number(row.parents_sent_request ?? 0),
    parentsWithMatch: Number(row.parents_with_match ?? 0),
    conversionToRequestPct: Number(row.conversion_to_request_pct ?? 0),
    conversionToMatchPct: Number(row.conversion_to_match_pct ?? 0),
  };
}
