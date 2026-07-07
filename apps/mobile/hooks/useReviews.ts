import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

export function useSubmitReview(professionalId?: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (reviewData: {
      matchId: string;
      reviewerRole: "parent" | "professional";
      reliability: number;
      professionalism: number;
      child_fit: number;
      text?: string;
    }) => {
      // Get current authenticated user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error("User session not found");
      }

      const { data, error } = await supabase
        .from("reviews")
        .insert({
          match_id: reviewData.matchId,
          reviewer_id: userData.user.id,
          reviewer_role: reviewData.reviewerRole,
          reliability: reviewData.reliability,
          professionalism: reviewData.professionalism,
          child_fit: reviewData.child_fit,
          text: reviewData.text || null,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate professional details and reviews list to reflect updated rating
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
