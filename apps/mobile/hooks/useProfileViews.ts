import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export interface ProfileViewEntry {
  id: string;
  created_at: string;
  viewer_name: string | null;
}

export function useProfileViews(childId: string | undefined) {
  return useQuery({
    queryKey: ["profileViews", childId],
    queryFn: async () => {
      const { data: details, error: detailsError } = await supabase
        .from("child_details")
        .select("id")
        .eq("child_id", childId!)
        .maybeSingle();

      if (detailsError) throw new Error(detailsError.message);
      if (!details?.id) return [] as ProfileViewEntry[];

      const { data, error } = await supabase
        .from("audit_log")
        .select("id, created_at, user_id, profiles(full_name)")
        .eq("resource", "child_details")
        .eq("resource_id", details.id)
        .eq("action", "view")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw new Error(error.message);

      return (data ?? []).map((row: any) => ({
        id: row.id as string,
        created_at: row.created_at as string,
        viewer_name: row.profiles?.full_name ?? null,
      })) as ProfileViewEntry[];
    },
    enabled: Boolean(childId),
  });
}
