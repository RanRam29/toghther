import { useQuery } from "@tanstack/react-query";

import {
  fetchAdminActiveMatches,
  type AdminMatchHealth,
} from "@/lib/api/admin-matches";

export const adminMatchesKey = ["admin", "matches"] as const;

export function useAdminMatches() {
  return useQuery({
    queryKey: adminMatchesKey,
    queryFn: fetchAdminActiveMatches,
  });
}

export function filterConcernedMatches(
  matches: AdminMatchHealth[],
  concernedOnly: boolean,
): AdminMatchHealth[] {
  if (!concernedOnly) return matches;
  return matches.filter((m) => m.isConcerned);
}
