import { useQuery } from "@tanstack/react-query";

import { AnalyticsEvents } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { getMatchesForChild } from "@/lib/api/matches";

export const matchesQueryKey = (childId: string) => ["matches", childId] as const;

export function useChildMatches(childId: string | undefined, limit = 5) {
  return useQuery({
    queryKey: [...matchesQueryKey(childId ?? ""), limit],
    queryFn: async () => {
      const matches = await getMatchesForChild(childId!, limit);
      void track(AnalyticsEvents.MATCHES_VIEWED, {
        child_id: childId!,
        results_count: matches.length,
      });
      return matches;
    },
    enabled: Boolean(childId),
  });
}
