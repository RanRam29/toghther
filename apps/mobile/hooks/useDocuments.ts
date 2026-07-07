import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createDocumentRecord,
  deleteDocument,
  fetchDocuments,
} from "@/lib/api/documents";

export const documentsQueryKey = (ownerId: string) =>
  ["documents", ownerId] as const;

export function useDocuments(ownerId: string | undefined) {
  return useQuery({
    queryKey: documentsQueryKey(ownerId ?? ""),
    queryFn: () => fetchDocuments(ownerId!),
    enabled: Boolean(ownerId),
  });
}

export function useCreateDocumentRecord(ownerId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDocumentRecord,
    onSuccess: () => {
      if (ownerId) {
        queryClient.invalidateQueries({ queryKey: documentsQueryKey(ownerId) });
      }
    },
  });
}

export function useDeleteDocument(ownerId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, storagePath }: { id: string; storagePath: string }) =>
      deleteDocument(id, storagePath),
    onSuccess: () => {
      if (ownerId) {
        queryClient.invalidateQueries({ queryKey: documentsQueryKey(ownerId) });
      }
    },
  });
}
