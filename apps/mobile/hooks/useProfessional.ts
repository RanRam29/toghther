import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  expressInterest,
  fetchIncomingRequests,
  fetchMyProfessional,
  fetchPublishedChildren,
  respondToRequest,
  updateMyProfessional,
} from "@/lib/api/professional";

export const professionalQueryKey = (userId: string) =>
  ["professional", userId] as const;
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
    mutationFn: ({
      requestId,
      status,
    }: {
      requestId: string;
      status: "interested" | "rejected";
    }) => respondToRequest(requestId, status),
    onSuccess: () => {
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
    onSuccess: () => {
      if (professionalId) {
        queryClient.invalidateQueries({
          queryKey: incomingRequestsQueryKey(professionalId),
        });
      }
    },
  });
}
