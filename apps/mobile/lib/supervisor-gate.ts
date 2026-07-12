import { REQUIRED_DOC_TYPES } from "@/lib/verification";
import type { DocumentUpload } from "@/lib/api/documents";

/** Client-side gate until backend enforces document views. */
export function hasViewedAllRequiredDocuments(
  documents: DocumentUpload[],
  viewedIds: Set<string>,
): boolean {
  return REQUIRED_DOC_TYPES.every((type) => {
    const doc = documents.find((d) => d.doc_type === type);
    if (!doc) return true;
    return viewedIds.has(doc.id);
  });
}

export function canSupervisorReject(
  documents: DocumentUpload[],
  viewedIds: Set<string>,
): boolean {
  const requiredPresent = REQUIRED_DOC_TYPES.filter((type) =>
    documents.some((d) => d.doc_type === type),
  );
  if (requiredPresent.length === 0) return false;
  return requiredPresent.every((type) => {
    const doc = documents.find((d) => d.doc_type === type)!;
    return viewedIds.has(doc.id);
  });
}

export function isAssignedToUser(
  assignedSupervisorId: string | null | undefined,
  userId: string | undefined,
): boolean {
  return Boolean(userId && assignedSupervisorId === userId);
}
