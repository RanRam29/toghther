import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AnalyticsEvents } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import {
  expressInterest,
  fetchIncomingRequests,
  fetchMyProfessional,
  fetchProfessionalById,
  fetchPublishedChildren,
  respondToRequest,
  updateMyProfessional,
} from "@/lib/api/professional";
import { supabase } from "@/lib/supabase";

export const professionalQueryKey = (userId: string) =>
  ["professional", userId] as const;
export const professionalByIdQueryKey = (professionalId: string) =>
  ["professionalById", professionalId] as const;
export const incomingRequestsQueryKey = (professionalId: string) =>
  ["incomingRequests", professionalId] as const;
export const publishedChildrenQueryKey = ["publishedChildren"] as const;

export function useMyProfessional(userId: string | undefined) {
  return useQuery({
    queryKey: professionalQueryKey(userId ?? ""),
    queryFn: () => fetchMyProfessional(userId!),
    enabled: Boolean(userId),
  });
}

export function useProfessionalById(professionalId: string | undefined) {
  return useQuery({
    queryKey: professionalByIdQueryKey(professionalId ?? ""),
    queryFn: () => fetchProfessionalById(professionalId!),
    enabled: Boolean(professionalId),
  });
}

export function useUpdateMyProfessional(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Parameters<typeof updateMyProfessional>[1]) => {
      if (!userId) throw new Error("Not authenticated");
      return updateMyProfessional(userId, input);
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: professionalQueryKey(userId) });
      }
    },
  });
}

export function useIncomingRequests(professionalId: string | undefined) {
  return useQuery({
    queryKey: incomingRequestsQueryKey(professionalId ?? ""),
    queryFn: () => fetchIncomingRequests(professionalId!),
    enabled: Boolean(professionalId),
  });
}

export function useRespondToRequest(professionalId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      status,
    }: {
      requestId: string;
      status: "interested" | "rejected";
    }) => {
      const { data: requestRow } = await supabase
        .from("match_requests")
        .select("created_at")
        .eq("id", requestId)
        .maybeSingle();

      await respondToRequest(requestId, status);

      const hoursToRespond = requestRow?.created_at
        ? Math.round(
            (Date.now() - new Date(requestRow.created_at).getTime()) / 3600000,
          )
        : 0;

      return { requestId, status, hoursToRespond };
    },
    onSuccess: (result) => {
      void track(AnalyticsEvents.PRO_REQUEST_RESPONDED, {
        request_id: result.requestId,
        response: result.status,
        hours_to_respond: result.hoursToRespond,
      });
      if (professionalId) {
        queryClient.invalidateQueries({
          queryKey: incomingRequestsQueryKey(professionalId),
        });
      }
    },
  });
}

export function usePublishedChildren(enabled: boolean) {
  return useQuery({
    queryKey: publishedChildrenQueryKey,
    queryFn: fetchPublishedChildren,
    enabled,
  });
}

export function useExpressInterest(professionalId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (childId: string) => {
      if (!professionalId) throw new Error("Not a professional");
      return expressInterest(childId, professionalId);
    },
    onSuccess: (_data, childId) => {
      void track(AnalyticsEvents.PRO_BROWSE_INTEREST, { child_id: childId });
      if (professionalId) {
        queryClient.invalidateQueries({
          queryKey: incomingRequestsQueryKey(professionalId),
        });
      }
    },
  });
}
