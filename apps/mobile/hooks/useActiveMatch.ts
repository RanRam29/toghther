import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AnalyticsEvents } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import {
  endMatch,
  fetchActiveMatchForParent,
  fetchActiveMatchForProfessional,
} from "@/lib/api/active-match";
import { createMatchFromRequest } from "@/lib/api/matches";
import { supabase } from "@/lib/supabase";
import { matchRequestsQueryKey } from "@/hooks/useMatchRequests";

export const activeMatchParentKey = (parentId: string) =>
  ["activeMatch", "parent", parentId] as const;
export const activeMatchProKey = (proId: string) =>
  ["activeMatch", "professional", proId] as const;

export function useActiveMatchForParent(parentId: string | undefined) {
  return useQuery({
    queryKey: activeMatchParentKey(parentId ?? ""),
    queryFn: () => fetchActiveMatchForParent(parentId!),
    enabled: Boolean(parentId),
  });
}

export function useActiveMatchForProfessional(professionalId: string | undefined) {
  return useQuery({
    queryKey: activeMatchProKey(professionalId ?? ""),
    queryFn: () => fetchActiveMatchForProfessional(professionalId!),
    enabled: Boolean(professionalId),
  });
}

export function useCreateMatchFromRequest(parentId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => createMatchFromRequest(requestId),
    onSuccess: (matchId) => {
      void track(AnalyticsEvents.MATCH_CREATED, { match_id: matchId });
      if (parentId) {
        queryClient.invalidateQueries({
          queryKey: matchRequestsQueryKey(parentId),
        });
        queryClient.invalidateQueries({
          queryKey: activeMatchParentKey(parentId),
        });
      }
    },
  });
}

export function useEndMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ matchId, reason }: { matchId: string; reason?: string }) =>
      endMatch(matchId, reason),
    onSuccess: async (_data, vars) => {
      const { data: match } = await supabase
        .from("matches")
        .select("started_at")
        .eq("id", vars.matchId)
        .maybeSingle();

      const durationDays = match?.started_at
        ? Math.floor(
            (Date.now() - new Date(match.started_at).getTime()) / 86400000,
          )
        : 0;

      void track(AnalyticsEvents.MATCH_ENDED, {
        match_id: vars.matchId,
        reason: vars.reason ?? "unspecified",
        duration_days: durationDays,
      });
      queryClient.invalidateQueries({ queryKey: ["activeMatch"] });
    },
  });
}
