import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  adminUnpublishChild,
  fetchAdminChildren,
} from "@/lib/api/admin-children";

export const adminChildrenKey = ["admin", "children"] as const;

export function useAdminChildren() {
  return useQuery({
    queryKey: adminChildrenKey,
    queryFn: fetchAdminChildren,
  });
}

export function useUnpublishChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ childId, reason }: { childId: string; reason: string }) =>
      adminUnpublishChild(childId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminChildrenKey });
    },
  });
}
