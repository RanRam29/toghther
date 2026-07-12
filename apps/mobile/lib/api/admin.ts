import type { DocumentUpload } from "@/lib/api/documents";
import { getDocumentSignedUrl } from "@/lib/api/documents";
import type { VerificationChecklistState } from "@/lib/admin-verification";
import type { Professional } from "@/lib/types";
import { supabase } from "@/lib/supabase";

export interface VerificationQueueItem extends Professional {
  profile: {
    full_name: string | null;
    area: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null;
}

export async function fetchVerificationQueue(): Promise<VerificationQueueItem[]> {
  const { data, error } = await supabase
    .from("professionals")
    .select(
      `
      *,
      profile:profiles!professionals_user_id_fkey (
        full_name,
        area,
        phone,
        avatar_url
      )
    `,
    )
    .eq("verified", "submitted")
    .order("updated_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as VerificationQueueItem[];
}

export async function fetchProfessionalForReview(
  professionalId: string,
): Promise<VerificationQueueItem | null> {
  const { data, error } = await supabase
    .from("professionals")
    .select(
      `
      *,
      profile:profiles!professionals_user_id_fkey (
        full_name,
        area,
        phone,
        avatar_url
      )
    `,
    )
    .eq("id", professionalId)
    .maybeSingle();

  if (error) throw error;
  return data as VerificationQueueItem | null;
}

export async function fetchProfessionalDocuments(
  userId: string,
): Promise<DocumentUpload[]> {
  const { data, error } = await supabase
    .from("document_uploads")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DocumentUpload[];
}

export async function getAdminDocumentUrl(
  storagePath: string,
): Promise<string> {
  return getDocumentSignedUrl(storagePath, 300);
}

export async function adminVerifyProfessional(
  professionalId: string,
  checklist: VerificationChecklistState,
): Promise<void> {
  const { error } = await supabase.rpc("admin_verify_professional", {
    p_pro_id: professionalId,
    p_checklist: checklist,
  });

  if (error) throw error;
}

export async function adminRejectDocument(
  documentId: string,
  reason: string,
): Promise<void> {
  const { error } = await supabase.rpc("admin_reject_document", {
    p_doc_id: documentId,
    p_reason: reason.trim(),
  });

  if (error) throw error;
}
