import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export interface Checkin {
  id: string;
  match_id: string;
  is_valid: boolean | null;
  created_at: string;
  checkout_at: string | null;
  checkout_valid: boolean | null;
}

function startOfTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function useMatchCheckins(matchId: string | undefined) {
  return useQuery({
    queryKey: ["checkins", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkins")
        .select("id, match_id, is_valid, created_at, checkout_at, checkout_valid")
        .eq("match_id", matchId!)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as Checkin[];
    },
    enabled: Boolean(matchId),
  });
}

export function useTodayCheckin(matchId: string | undefined) {
  const query = useMatchCheckins(matchId);
  const todayStart = startOfTodayIso();

  const todayCheckin =
    query.data?.find((c) => c.created_at >= todayStart && c.is_valid === true) ??
    query.data?.find((c) => c.created_at >= todayStart) ??
    null;

  return { ...query, todayCheckin };
}
