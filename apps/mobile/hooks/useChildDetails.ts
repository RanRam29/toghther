import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchChildDetails, upsertChildDetails } from "@/lib/api/child-details";

export const childDetailsQueryKey = (childId: string) =>
  ["childDetails", childId] as const;

export function useChildDetails(childId: string | undefined) {
  return useQuery({
    queryKey: childDetailsQueryKey(childId ?? ""),
    queryFn: () => fetchChildDetails(childId!),
    enabled: Boolean(childId),
  });
}

export function useUpsertChildDetails(childId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Parameters<typeof upsertChildDetails>[1]) => {
      if (!childId) throw new Error("No child selected");
      return upsertChildDetails(childId, input);
    },
    onSuccess: () => {
      if (childId) {
        queryClient.invalidateQueries({ queryKey: childDetailsQueryKey(childId) });
      }
    },
  });
}
