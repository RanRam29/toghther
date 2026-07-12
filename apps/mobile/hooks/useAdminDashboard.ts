import { useQuery } from "@tanstack/react-query";

import { fetchAnalyticsEventCounts } from "@/lib/api/admin-analytics";
import {
  fetchParentFunnel,
  fetchPlatformMetrics,
} from "@/lib/api/admin-dashboard";

export const platformMetricsKey = ["admin", "platform-metrics"] as const;
export const parentFunnelKey = ["admin", "parent-funnel"] as const;
export const analyticsEventsKey = ["admin", "analytics-events"] as const;

export function usePlatformMetrics() {
  return useQuery({
    queryKey: platformMetricsKey,
    queryFn: fetchPlatformMetrics,
    refetchInterval: 120_000,
  });
}

export function useParentFunnel() {
  return useQuery({
    queryKey: parentFunnelKey,
    queryFn: fetchParentFunnel,
    refetchInterval: 120_000,
  });
}

export function useAnalyticsEventCounts() {
  return useQuery({
    queryKey: analyticsEventsKey,
    queryFn: fetchAnalyticsEventCounts,
    refetchInterval: 120_000,
  });
}
