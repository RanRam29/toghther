import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AnalyticsEvents } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@toghther/shared";

export interface Review {
  id: string;
  match_id: string;
  reviewer_id: string;
  reviewer_role: UserRole;
  reliability: number;
  professionalism: number;
  child_fit: number;
  text: string | null;
  created_at: string;
  reviewer?: {
    full_name: string | null;
  } | null;
}

export function useGetReviewsForProfessional(professionalId: string) {
  return useQuery({
    queryKey: ["reviews", professionalId],
    queryFn: async () => {
      // Query reviews table and filter by professional_id inside the related match
      const { data, error } = await supabase
        .from("reviews")
        .select(`
          id,
          match_id,
          reviewer_id,
          reviewer_role,
          reliability,
          professionalism,
          child_fit,
          text,
          created_at,
          reviewer:profiles(full_name),
          match:matches!inner(professional_id)
        `)
        .eq("match.professional_id", professionalId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      // Format returned object to match Review interface
      return (data || []).map((row: any) => ({
        id: row.id,
        match_id: row.match_id,
        reviewer_id: row.reviewer_id,
        reviewer_role: row.reviewer_role,
        reliability: row.reliability,
        professionalism: row.professionalism,
        child_fit: row.child_fit,
        text: row.text,
        created_at: row.created_at,
        reviewer: row.reviewer,
      })) as Review[];
    },
    enabled: Boolean(professionalId),
  });
}

export function useMatchReviewStatus(matchId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["reviewStatus", matchId, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, reviewer_id, reviewer_role")
        .eq("match_id", matchId!);

      if (error) throw new Error(error.message);

      const mine = data?.find((r) => r.reviewer_id === userId) ?? null;
      const other = data?.find((r) => r.reviewer_id !== userId) ?? null;

      return {
        hasSubmitted: Boolean(mine),
        otherHasSubmitted: Boolean(other),
        isBlind: Boolean(mine) && !other,
        reviews: data ?? [],
      };
    },
    enabled: Boolean(matchId) && Boolean(userId),
  });
}

export function useSubmitReview(professionalId?: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (reviewData: {
      matchId: string;
      reliability: number;
      professionalism: number;
      child_fit: number;
      text?: string;
    }) => {
      const criteria = {
        reliability: reviewData.reliability,
        professionalism: reviewData.professionalism,
        child_fit: reviewData.child_fit,
      };

      const { error } = await supabase.rpc("submit_review", {
        p_match_id: reviewData.matchId,
        p_criteria: criteria,
        p_text: reviewData.text?.trim() ?? "",
      });

      if (error) throw new Error(error.message);

      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user?.id ?? "")
        .maybeSingle();

      return {
        role: (profile?.role as string) ?? "parent",
      };
    },
    onSuccess: (result, variables) => {
      void track(AnalyticsEvents.REVIEW_SUBMITTED, {
        match_id: variables.matchId,
        role: result.role,
      });
      queryClient.invalidateQueries({
        queryKey: ["reviewStatus", variables.matchId],
      });
      if (professionalId) {
        queryClient.invalidateQueries({ queryKey: ["reviews", professionalId] });
        queryClient.invalidateQueries({ queryKey: ["professional", professionalId] });
      }
    },
  });

  return {
    submitReview: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
