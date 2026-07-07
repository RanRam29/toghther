import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  approveMatchRequest,
  createMatchRequest,
  fetchMatchRequestsForParent,
  rejectMatchRequest,
} from "@/lib/api/matches";

export const matchRequestsQueryKey = (parentId: string) =>
  ["matchRequests", parentId] as const;

export function useMatchRequests(parentId: string | undefined, childIds: string[]) {
  return useQuery({
    queryKey: matchRequestsQueryKey(parentId ?? ""),
    queryFn: () => fetchMatchRequestsForParent(childIds),
    enabled: Boolean(parentId) && childIds.length > 0,
  });
}

export function useCreateMatchRequest(parentId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMatchRequest,
    onSuccess: () => {
      if (parentId) {
        queryClient.invalidateQueries({
          queryKey: matchRequestsQueryKey(parentId),
        });
      }
    },
  });
}

export function useApproveMatchRequest(parentId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveMatchRequest,
    onSuccess: () => {
      if (parentId) {
        queryClient.invalidateQueries({
          queryKey: matchRequestsQueryKey(parentId),
        });
        // Invalidate active matches query key to update active match screens
        queryClient.invalidateQueries({
          queryKey: ["matches", parentId],
        });
      }
    },
  });
}

export function useRejectMatchRequest(parentId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rejectMatchRequest,
    onSuccess: () => {
      if (parentId) {
        queryClient.invalidateQueries({
          queryKey: matchRequestsQueryKey(parentId),
        });
      }
    },
  });
}
