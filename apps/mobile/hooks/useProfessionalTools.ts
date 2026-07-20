import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface MonthlyAttendanceMatch {
  match_id: string;
  child_name: string;
  days_attended: number;
  attended_dates: string[];
  days_off: number;
  off_dates: string[];
}

export function useMonthlyAttendance(month: string) {
  return useQuery({
    queryKey: ["monthly_attendance", month],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_monthly_attendance" as any, {
        p_month: month,
      });

      if (error) {
        throw new Error(error.message);
      }

      return data as MonthlyAttendanceMatch[];
    },
    enabled: Boolean(month),
  });
}

export function useMarkDaysOffRange() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      matchId,
      startDate,
      endDate,
      reason,
    }: {
      matchId: string;
      startDate: string;
      endDate: string;
      reason?: string;
    }) => {
      const { error } = await supabase.rpc("mark_days_off_range" as any, {
        p_match_id: matchId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_reason: reason || null,
      });

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["monthly_attendance"] });
      queryClient.invalidateQueries({ queryKey: ["active_matches_pro"] });
    },
  });

  return {
    markDaysOffRange: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}

export interface ProfessionalStats {
  professional_id: string;
  user_id: string;
  months_active: number;
  completed_matches: number;
}

export function useProfessionalPublicStats(proId: string | undefined) {
  return useQuery({
    queryKey: ["professional_public_stats", proId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_public_stats_view" as any)
        .select("*")
        .eq("professional_id", proId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw new Error(error.message);
      }

      return (data as unknown as ProfessionalStats) || null;
    },
    enabled: Boolean(proId),
  });
}

export function useMyReportingConsistency(proId: string | undefined) {
  return useQuery({
    queryKey: ["professional_reporting_consistency", proId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_professional_reporting_consistency" as any,
        {
          p_professional_id: proId,
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      return (data as number) || 0;
    },
    enabled: Boolean(proId),
  });
}
