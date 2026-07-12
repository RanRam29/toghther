import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  adminSetConfig,
  adminUpdateMetricCatalog,
  fetchMetricCatalog,
  fetchSystemConfig,
  type ConfigKey,
} from "@/lib/api/admin-config";

export const systemConfigKey = ["admin", "system-config"] as const;
export const metricCatalogKey = ["admin", "metric-catalog"] as const;

export function useSystemConfig() {
  return useQuery({
    queryKey: systemConfigKey,
    queryFn: fetchSystemConfig,
  });
}

export function useMetricCatalog() {
  return useQuery({
    queryKey: metricCatalogKey,
    queryFn: fetchMetricCatalog,
  });
}

export function useUpdateMetricCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminUpdateMetricCatalog,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: metricCatalogKey });
    },
  });
}

export function useSetSystemConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: ConfigKey; value: unknown }) =>
      adminSetConfig(key, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: systemConfigKey });
    },
  });
}
