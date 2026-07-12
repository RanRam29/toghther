import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { pauseMatch, resumeMatch } from "@/lib/api/active-match";
import { supabase } from "@/lib/supabase";
import type { Match } from "@toghther/shared";

export interface ChildDetailsPreview {
  full_name: string | null;
  diagnosis_full: string | null;
  what_works: string | null;
  what_triggers: string | null;
  win_definition: string | null;
  notes: string | null;
}

export function useMatchById(matchId: string | undefined) {
  return useQuery({
    queryKey: ["match", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(
          `*,
           child:children(id, first_name),
           professional:professionals(id, display_name)`,
        )
        .eq("id", matchId!)
        .single();

      if (error) throw new Error(error.message);
      return data as Match & {
        child: { id: string; first_name: string } | null;
        professional: { id: string; display_name: string } | null;
      };
    },
    enabled: Boolean(matchId),
  });
}

export function useChildDetailsPreview(childId: string | undefined) {
  return useQuery({
    queryKey: ["childDetailsPreview", childId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("child_details")
        .select(
          "full_name, diagnosis_full, what_works, what_triggers, win_definition, notes",
        )
        .eq("child_id", childId!)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return (data ?? null) as ChildDetailsPreview | null;
    },
    enabled: Boolean(childId),
  });
}

export function usePauseMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (matchId: string) => pauseMatch(matchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeMatch"] });
    },
  });
}

export function useResumeMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (matchId: string) => resumeMatch(matchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeMatch"] });
    },
  });
}
