import { supabase } from "@/lib/supabase";

export async function fetchAnalyticsEventCounts(): Promise<
  Record<string, number>
> {
  const { data, error } = await supabase
    .from("analytics_events" as "audit_log")
    .select("event_name")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    console.warn("[dashboard] analytics_events:", error.message);
    return {};
  }

  const rows = (data ?? []) as unknown as Array<{ event_name: string }>;
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.event_name] = (counts[row.event_name] ?? 0) + 1;
  }
  return counts;
}
