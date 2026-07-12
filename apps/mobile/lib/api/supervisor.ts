import type { DocumentUpload } from "@/lib/api/documents";
import { getDocumentSignedUrl } from "@/lib/api/documents";
import type { VerificationChecklistState } from "@/lib/admin-verification";
import type { Professional } from "@/lib/types";
import { supabase } from "@/lib/supabase";

/** Profile fields exposed in verification queue (no phone for supervisor). */
export type VerificationProfilePublic = {
  full_name: string | null;
  area: string | null;
  avatar_url: string | null;
  phone?: string | null;
};

export interface VerificationQueueItem extends Professional {
  assigned_supervisor_id: string | null;
  assigned_at: string | null;
  profile: VerificationProfilePublic | null;
}

const PROFILE_PUBLIC =
  "full_name, area, avatar_url" as const;
const PROFILE_WITH_PHONE =
  "full_name, area, avatar_url, phone" as const;

const QUEUE_SELECT = (profileFields: string) => `
  *,
  profile:profiles!professionals_user_id_fkey (${profileFields})
`;

async function fetchSubmittedRaw(
  includePhone: boolean,
): Promise<VerificationQueueItem[]> {
  const fields = includePhone ? PROFILE_WITH_PHONE : PROFILE_PUBLIC;
  const { data, error } = await supabase
    .from("professionals")
    .select(QUEUE_SELECT(fields))
    .eq("verified", "submitted")
    .order("updated_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as VerificationQueueItem[];
}

export async function fetchUnassignedQueue(
  includePhone = false,
): Promise<VerificationQueueItem[]> {
  const all = await fetchSubmittedRaw(includePhone);
  return all.filter((p) => !p.assigned_supervisor_id);
}

export async function fetchMyAssignedQueue(
  supervisorId: string,
  includePhone = false,
): Promise<VerificationQueueItem[]> {
  const all = await fetchSubmittedRaw(includePhone);
  return all.filter((p) => p.assigned_supervisor_id === supervisorId);
}

/** Legacy — all submitted. */
export async function fetchAllSubmittedQueue(
  includePhone = false,
): Promise<VerificationQueueItem[]> {
  return fetchSubmittedRaw(includePhone);
}

export async function fetchProfessionalForReview(
  professionalId: string,
  includePhone = false,
): Promise<VerificationQueueItem | null> {
  const fields = includePhone ? PROFILE_WITH_PHONE : PROFILE_PUBLIC;
  const { data, error } = await supabase
    .from("professionals")
    .select(QUEUE_SELECT(fields))
    .eq("id", professionalId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as VerificationQueueItem | null;
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

export async function getStaffDocumentUrl(storagePath: string): Promise<string> {
  return getDocumentSignedUrl(storagePath, 300);
}

export async function supervisorClaimProfessional(
  professionalId: string,
): Promise<void> {
  const { error } = await supabase.rpc("supervisor_claim_professional", {
    p_pro_id: professionalId,
  });
  if (error) throw error;
}

export async function supervisorLogDocumentView(
  documentId: string,
): Promise<void> {
  const { error } = await supabase.rpc("supervisor_log_document_view", {
    p_doc_id: documentId,
  });
  if (error) {
    console.warn("[supervisor] log_document_view:", error.message);
  }
}

export async function staffVerifyProfessional(
  professionalId: string,
  checklist: VerificationChecklistState,
  useSupervisorRpc: boolean,
): Promise<void> {
  const rpcName = useSupervisorRpc
    ? "supervisor_verify_professional"
    : "admin_verify_professional";
  const { error } = await supabase.rpc(rpcName, {
    p_pro_id: professionalId,
    p_checklist: checklist,
  });
  if (error) throw error;
}

export interface RejectDocumentResult {
  phone: string | null;
}

export async function staffRejectDocument(
  documentId: string,
  reason: string,
  useSupervisorRpc: boolean,
): Promise<RejectDocumentResult> {
  const rpcName = useSupervisorRpc
    ? "supervisor_reject_document"
    : "admin_reject_document";

  if (useSupervisorRpc) {
    const { data, error } = await supabase.rpc(rpcName, {
      p_doc_id: documentId,
      p_reason: reason.trim(),
    });
    if (error) throw error;
    const payload = data as { phone?: string } | null;
    return { phone: payload?.phone ?? null };
  }

  const { error } = await supabase.rpc(rpcName, {
    p_doc_id: documentId,
    p_reason: reason.trim(),
  });
  if (error) throw error;
  return { phone: null };
}

export async function adminReleaseAssignment(
  professionalId: string,
): Promise<void> {
  const { error } = await supabase.rpc("admin_release_supervisor_assignment", {
    p_pro_id: professionalId,
  });
  if (error) throw error;
}
