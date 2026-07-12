import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AnalyticsEvents } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import type { VerificationChecklistState } from "@/lib/admin-verification";
import {
  adminReleaseAssignment,
  fetchAllSubmittedQueue,
  fetchMyAssignedQueue,
  fetchProfessionalDocuments,
  fetchProfessionalForReview,
  fetchUnassignedQueue,
  staffRejectDocument,
  staffVerifyProfessional,
  supervisorClaimProfessional,
} from "@/lib/api/supervisor";

export const unassignedQueueKey = ["staff", "queue", "unassigned"] as const;
export const myQueueKey = (userId: string) =>
  ["staff", "queue", "mine", userId] as const;

export function useUnassignedQueue(isAdmin: boolean) {
  return useQuery({
    queryKey: unassignedQueueKey,
    queryFn: async () => {
      try {
        return await fetchUnassignedQueue(isAdmin);
      } catch {
        if (isAdmin) return fetchAllSubmittedQueue(true);
        return [];
      }
    },
    refetchInterval: 60_000,
  });
}

export function useMyAssignedQueue(
  supervisorId: string | undefined,
  isAdmin: boolean,
) {
  return useQuery({
    queryKey: myQueueKey(supervisorId ?? ""),
    queryFn: async () => {
      if (!supervisorId) return [];
      try {
        return await fetchMyAssignedQueue(supervisorId, isAdmin);
      } catch {
        if (isAdmin) return fetchAllSubmittedQueue(true);
        return [];
      }
    },
    enabled: Boolean(supervisorId),
    refetchInterval: 60_000,
  });
}

export const professionalReviewKey = (id: string) =>
  ["staff", "professional-review", id] as const;

export function useProfessionalReview(
  professionalId: string | undefined,
  includePhone: boolean,
) {
  return useQuery({
    queryKey: [...professionalReviewKey(professionalId ?? ""), includePhone],
    queryFn: () => fetchProfessionalForReview(professionalId!, includePhone),
    enabled: Boolean(professionalId),
  });
}

export function useProfessionalDocuments(userId: string | undefined) {
  return useQuery({
    queryKey: ["staff", "professional-documents", userId ?? ""],
    queryFn: () => fetchProfessionalDocuments(userId!),
    enabled: Boolean(userId),
  });
}

export function useClaimProfessional() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: supervisorClaimProfessional,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: unassignedQueueKey });
      queryClient.invalidateQueries({ queryKey: ["staff", "queue", "mine"] });
    },
  });
}

export function useStaffVerifyProfessional(useSupervisorRpc: boolean) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      professionalId,
      checklist,
      submittedAt,
    }: {
      professionalId: string;
      checklist: VerificationChecklistState;
      submittedAt?: string;
    }) => staffVerifyProfessional(professionalId, checklist, useSupervisorRpc),
    onSuccess: (_data, vars) => {
      const daysWaited = vars.submittedAt
        ? Math.floor(
            (Date.now() - new Date(vars.submittedAt).getTime()) / 86400000,
          )
        : 0;
      void track(AnalyticsEvents.PRO_VERIFIED, { days_waited: daysWaited });
      queryClient.invalidateQueries({ queryKey: unassignedQueueKey });
      queryClient.invalidateQueries({ queryKey: ["staff", "queue", "mine"] });
    },
  });
}

export function useStaffRejectDocument(useSupervisorRpc: boolean) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      documentId,
      reason,
    }: {
      documentId: string;
      reason: string;
      userId: string;
    }) => staffRejectDocument(documentId, reason, useSupervisorRpc),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: unassignedQueueKey });
      queryClient.invalidateQueries({ queryKey: ["staff", "queue", "mine"] });
      queryClient.invalidateQueries({
        queryKey: ["staff", "professional-documents", vars.userId],
      });
    },
  });
}

export function useReleaseAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminReleaseAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: unassignedQueueKey });
      queryClient.invalidateQueries({ queryKey: ["staff", "queue", "mine"] });
    },
  });
}
