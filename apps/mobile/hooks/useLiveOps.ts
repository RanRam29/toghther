import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export interface LiveOpsAlert {
  alert_id: string;
  alert_type: "INACTIVE_MATCH" | "PENDING_PROFESSIONAL" | "STALE_REQUEST";
  severity: "HIGH" | "MEDIUM" | "LOW";
  resource_id: string;
  details: any;
  created_at: string;
}

export function useLiveOpsAlerts() {
  return useQuery({
    queryKey: ["live_ops_alerts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_live_ops_alerts");
      if (error) {
        throw new Error(error.message);
      }
      return (data ?? []) as LiveOpsAlert[];
    },
    refetchInterval: 60000, // Refresh every minute for "live" feel
  });
}
