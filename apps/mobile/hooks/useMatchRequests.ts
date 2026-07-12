import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AnalyticsEvents } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import {
  approveMatchRequest,
  createMatchRequest,
  declineAfterIntro,
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
    onSuccess: (data) => {
      void track(AnalyticsEvents.REQUEST_SENT, {
        request_id: data.id,
        initiated_by: data.initiated_by ?? "parent",
      });
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
    onSuccess: (_data, requestId) => {
      void track(AnalyticsEvents.REQUEST_APPROVED, { request_id: requestId });
      if (parentId) {
        queryClient.invalidateQueries({
          queryKey: matchRequestsQueryKey(parentId),
        });
      }
    },
  });
}

export function useDeclineAfterIntro(parentId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason?: string }) =>
      declineAfterIntro(requestId, reason),
    onSuccess: () => {
      if (parentId) {
        queryClient.invalidateQueries({
          queryKey: matchRequestsQueryKey(parentId),
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
