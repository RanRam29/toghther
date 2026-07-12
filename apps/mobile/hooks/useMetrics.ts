import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export interface MetricCatalogItem {
  key: string;
  he_label: string;
  en_label: string;
  is_core: boolean;
}

export function useMetricsForChild(childId: string | undefined) {
  return useQuery({
    queryKey: ["metrics", childId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_metrics_for_child", {
        p_child_id: childId!,
      });
      if (error) throw new Error(error.message);
      return (data ?? []) as MetricCatalogItem[];
    },
    enabled: Boolean(childId),
  });
}

export function useSetMatchMetrics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      matchId,
      keys,
    }: {
      matchId: string;
      keys: string[];
    }) => {
      const { error } = await (supabase as any).rpc("set_match_metrics", {
        p_match_id: matchId,
        p_keys: keys,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["activeMatch"] });
      queryClient.invalidateQueries({
        queryKey: ["match", variables.matchId],
      });
    },
  });
}

export function useMatchMetricKeys(matchId: string | undefined) {
  return useQuery({
    queryKey: ["match", matchId, "metric_keys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("metric_keys, child_id")
        .eq("id", matchId!)
        .single();
      if (error) throw new Error(error.message);
      const row = data as { metric_keys?: string[] | null; child_id?: string } | null;
      return {
        metricKeys: row?.metric_keys ?? [],
        childId: row?.child_id as string,
      };
    },
    enabled: Boolean(matchId),
  });
}
