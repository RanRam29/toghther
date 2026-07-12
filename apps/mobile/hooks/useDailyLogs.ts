import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AnalyticsEvents } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { supabase } from "@/lib/supabase";

export interface DailyLog {
  id: string;
  match_id: string;
  log_date: string;
  mood: number;
  metrics: Record<string, number>;
  notes: string;
  ai_summary: string | null;
  ai_strategy: string | null;
  created_at: string;
}

export function useGetDailyLogs(matchId: string) {
  return useQuery({
    queryKey: ["daily_logs", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("match_id", matchId)
        .order("log_date", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data as DailyLog[];
    },
    enabled: Boolean(matchId),
  });
}

export function useSubmitDailyLog(matchId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (logData: {
      mood: number;
      metrics: Record<string, number>;
      notes: string;
      log_date?: string;
      seconds_to_complete?: number;
    }) => {
      const todayDate = logData.log_date ?? new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("daily_logs")
        .upsert(
          {
            match_id: matchId,
            log_date: todayDate,
            mood: logData.mood,
            metrics: logData.metrics,
            notes: logData.notes,
          },
          { onConflict: "match_id,log_date" },
        )
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as DailyLog;
    },
    onSuccess: (_data, variables) => {
      void track(AnalyticsEvents.DAILY_LOG_SUBMITTED, {
        match_id: matchId,
        seconds_to_complete: variables.seconds_to_complete ?? 0,
      });
      queryClient.invalidateQueries({ queryKey: ["daily_logs", matchId] });
    },
  });

  return {
    submitLog: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
