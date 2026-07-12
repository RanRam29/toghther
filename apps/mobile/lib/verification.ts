import type { DocumentType } from "@/lib/api/documents";
import type { DocumentUpload } from "@/lib/api/documents";
import type { Professional } from "@toghther/shared";

/** D15 required document types for verification. */
export const REQUIRED_DOC_TYPES: DocumentType[] = [
  "id_card",
  "criminal_record",
  "certificate",
];

export const OPTIONAL_DOC_TYPES: DocumentType[] = ["degree", "other"];

export type DocChecklistStatus = "missing" | "uploaded" | "rejected" | "approved";

export interface DocChecklistItem {
  type: DocumentType;
  status: DocChecklistStatus;
  document: DocumentUpload | null;
}

export function buildDocumentChecklist(
  documents: DocumentUpload[],
): DocChecklistItem[] {
  return REQUIRED_DOC_TYPES.map((type) => {
    const doc = documents.find((d) => d.doc_type === type) ?? null;
    let status: DocChecklistStatus = "missing";
    if (doc) {
      if (doc.verified) status = "approved";
      else if (doc.rejection_note) status = "rejected";
      else status = "uploaded";
    }
    return { type, status, document: doc };
  });
}

export function hasAllRequiredDocuments(documents: DocumentUpload[]): boolean {
  return REQUIRED_DOC_TYPES.every((type) =>
    documents.some((d) => d.doc_type === type),
  );
}

export function verificationProgress(documents: DocumentUpload[]): number {
  const uploaded = REQUIRED_DOC_TYPES.filter((type) =>
    documents.some((d) => d.doc_type === type),
  ).length;
  return Math.round((uploaded / REQUIRED_DOC_TYPES.length) * 100);
}

export function isProfessionalVerified(
  professional: Professional | null | undefined,
): boolean {
  return professional?.verified === "verified";
}

export function canAccessProfessionalFeatures(
  professional: Professional | null | undefined,
): boolean {
  return isProfessionalVerified(professional);
}
