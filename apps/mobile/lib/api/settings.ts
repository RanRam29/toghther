import { supabase } from "@/lib/supabase";

export interface NotificationPrefs {
  checkin: boolean;
  daily_summary: boolean;
}

export async function fetchNotificationPrefs(userId: string): Promise<NotificationPrefs> {
  const { data, error } = await (supabase as any)
    .from("notification_prefs")
    .select("checkin, daily_summary")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  
  if (!data) {
    // Default values if not inserted yet
    return { checkin: true, daily_summary: true };
  }

  return {
    checkin: data.checkin,
    daily_summary: data.daily_summary,
  };
}

export async function updateNotificationPrefs(
  userId: string,
  prefs: Partial<NotificationPrefs>
): Promise<void> {
  const { error } = await (supabase as any)
    .from("notification_prefs")
    .upsert({ user_id: userId, ...prefs }, { onConflict: "user_id" });

  if (error) throw error;
}
