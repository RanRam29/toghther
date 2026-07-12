import { useQuery } from "@tanstack/react-query";

import {
  fetchAdminMatchRequests,
  isStuckRequest,
  type AdminRequestRow,
} from "@/lib/api/admin-requests";

export const adminRequestsKey = ["admin", "requests"] as const;

export function useAdminMatchRequests() {
  return useQuery({
    queryKey: adminRequestsKey,
    queryFn: fetchAdminMatchRequests,
  });
}

export function filterStuckRequests(
  requests: AdminRequestRow[],
  stuckOnly: boolean,
): AdminRequestRow[] {
  if (!stuckOnly) return requests;
  return requests.filter(isStuckRequest);
}
