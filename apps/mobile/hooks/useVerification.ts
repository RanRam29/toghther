import { useMutation, useQueryClient } from "@tanstack/react-query";

import { AnalyticsEvents } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import type { DocumentUpload } from "@/lib/api/documents";
import { hasAllRequiredDocuments } from "@/lib/verification";
import { updateMyProfessional } from "@/lib/api/professional";
import { professionalQueryKey } from "@/hooks/useProfessional";

export function useSubmitForVerification(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documents: DocumentUpload[]) => {
      if (!userId) throw new Error("Not authenticated");
      if (!hasAllRequiredDocuments(documents)) {
        throw new Error("MISSING_REQUIRED_DOCS");
      }
      return updateMyProfessional(userId, { verified: "submitted" });
    },
    onSuccess: () => {
      void track(AnalyticsEvents.PRO_DOCS_SUBMITTED, {});
      if (userId) {
        queryClient.invalidateQueries({ queryKey: professionalQueryKey(userId) });
      }
    },
  });
}
