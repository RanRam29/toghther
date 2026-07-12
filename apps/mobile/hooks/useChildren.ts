import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AnalyticsEvents } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { createChild, fetchChildren, updateChild } from "@/lib/api/children";
import type { Child } from "@/lib/types";
import { useParentStore } from "@/stores/parent-store";

export const childrenQueryKey = (parentId: string) => ["children", parentId] as const;

export function useChildren(parentId: string | undefined) {
  const setSelectedChildId = useParentStore((s) => s.setSelectedChildId);
  const selectedChildId = useParentStore((s) => s.selectedChildId);

  const query = useQuery({
    queryKey: childrenQueryKey(parentId ?? ""),
    queryFn: () => fetchChildren(parentId!),
    enabled: Boolean(parentId),
  });

  const children = query.data ?? [];

  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId, setSelectedChildId]);

  const selectedChild =
    children.find((c) => c.id === selectedChildId) ?? children[0] ?? null;

  return { ...query, children, selectedChild };
}

export function useCreateChild(parentId: string | undefined) {
  const queryClient = useQueryClient();
  const setSelectedChildId = useParentStore((s) => s.setSelectedChildId);

  return useMutation({
    mutationFn: (input: Parameters<typeof createChild>[0]) => {
      if (!parentId) throw new Error("Not authenticated");
      return createChild(input);
    },
    onSuccess: (child) => {
      if (child.published) {
        void track(AnalyticsEvents.CHILD_PUBLISHED, { child_id: child.id });
      }
      if (parentId) {
        queryClient.invalidateQueries({ queryKey: childrenQueryKey(parentId) });
      }
      setSelectedChildId(child.id);
    },
  });
}

export function useUpdateChild(parentId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateChild>[1] }) =>
      updateChild(id, input),
    onSuccess: (child, vars) => {
      if (vars.input.published) {
        void track(AnalyticsEvents.CHILD_PUBLISHED, { child_id: child.id });
      }
      if (parentId) {
        queryClient.invalidateQueries({ queryKey: childrenQueryKey(parentId) });
      }
    },
  });
}

export function useSelectedChild(parentId: string | undefined): Child | null {
  const { selectedChild } = useChildren(parentId);
  return selectedChild;
}
