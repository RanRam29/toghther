import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AdminUserFilters } from "@/lib/api/admin-users";
import {
  adminRestoreUser,
  adminSuspendUser,
  fetchAdminNotes,
  fetchAdminUser,
  fetchAdminUsers,
} from "@/lib/api/admin-users";

export const adminUsersKey = (filters: AdminUserFilters) =>
  ["admin", "users", filters] as const;

export function useAdminUsers(filters: AdminUserFilters) {
  return useQuery({
    queryKey: adminUsersKey(filters),
    queryFn: () => fetchAdminUsers(filters),
  });
}

export function useAdminUser(userId: string | undefined) {
  return useQuery({
    queryKey: ["admin", "user", userId ?? ""],
    queryFn: () => fetchAdminUser(userId!),
    enabled: Boolean(userId),
  });
}

export function useAdminNotes(userId: string | undefined) {
  return useQuery({
    queryKey: ["admin", "notes", userId ?? ""],
    queryFn: () => fetchAdminNotes(userId!),
    enabled: Boolean(userId),
  });
}

export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      adminSuspendUser(userId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "user"] });
    },
  });
}

export function useRestoreUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminRestoreUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "user"] });
    },
  });
}
