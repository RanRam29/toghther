import { supabase } from "@/lib/supabase";

import { daysSince } from "@/lib/api/admin-requests";

export interface AdminMatchRow {
  id: string;
  status: string;
  started_at: string;
  child_id: string;
  professional_id: string;
  child: { first_name: string } | null;
  professional: { display_name: string } | null;
}

export interface AdminMatchHealth extends AdminMatchRow {
  daysSinceStart: number;
  daysSinceActivity: number;
  lastCheckinAt: string | null;
  lastLogDate: string | null;
  isConcerned: boolean;
}

function latestByMatch<T extends { match_id: string }>(
  rows: T[],
  getDate: (row: T) => string,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (!map.has(row.match_id)) {
      map.set(row.match_id, getDate(row));
    }
  }
  return map;
}

export async function fetchAdminActiveMatches(): Promise<AdminMatchHealth[]> {
  const { data, error } = await supabase
    .from("matches")
    .select(
      `
      id,
      status,
      started_at,
      child_id,
      professional_id,
      child:children(first_name),
      professional:professionals(display_name)
    `,
    )
    .eq("status", "active")
    .order("started_at", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as unknown as AdminMatchRow[];
  if (rows.length === 0) return [];

  const matchIds = rows.map((r) => r.id);

  const [{ data: checkins }, { data: logs }] = await Promise.all([
    supabase
      .from("checkins")
      .select("match_id, created_at")
      .in("match_id", matchIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("daily_logs")
      .select("match_id, log_date")
      .in("match_id", matchIds)
      .order("log_date", { ascending: false }),
  ]);

  const lastCheckin = latestByMatch(checkins ?? [], (r) => r.created_at);
  const lastLog = latestByMatch(logs ?? [], (r) => r.log_date);

  return rows.map((row) => {
    const daysSinceStart = daysSince(row.started_at);
    const checkinAt = lastCheckin.get(row.id) ?? null;
    const logDate = lastLog.get(row.id) ?? null;

    const activityDates = [checkinAt, logDate, row.started_at].filter(Boolean) as string[];
    const latestActivity = activityDates.reduce((latest, d) =>
      new Date(d) > new Date(latest) ? d : latest,
    activityDates[0]);

    const daysSinceActivity = daysSince(latestActivity);

    return {
      ...row,
      daysSinceStart,
      daysSinceActivity,
      lastCheckinAt: checkinAt,
      lastLogDate: logDate,
      isConcerned: daysSinceActivity >= 3,
    };
  });
}
