import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  approveAndCreateMatch,
  endMatch,
  fetchActiveMatchForParent,
  fetchActiveMatchForProfessional,
} from "@/lib/api/active-match";
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

export function useApproveAndCreateMatch(parentId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => approveAndCreateMatch(requestId),
    onSuccess: () => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeMatch"] });
    },
  });
}
