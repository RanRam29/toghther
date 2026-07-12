import { useQuery } from "@tanstack/react-query";

import {
  fetchAuditLog,
  type AuditLogFilters,
} from "@/lib/api/admin-audit";

export const adminAuditKey = (filters: AuditLogFilters) =>
  ["admin", "audit", filters] as const;

export function useAdminAudit(filters: AuditLogFilters) {
  return useQuery({
    queryKey: adminAuditKey(filters),
    queryFn: () => fetchAuditLog(filters),
  });
}
