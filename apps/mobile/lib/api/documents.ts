import type { Enums, TablesInsert } from "@toghther/shared";

import { supabase } from "@/lib/supabase";

export type DocumentType = Enums<"document_type">;

export interface DocumentUpload {
  id: string;
  owner_id: string;
  doc_type: DocumentType;
  storage_path: string;
  file_name: string | null;
  verified: boolean;
  verified_at: string | null;
  rejection_note: string | null;
  created_at: string;
}

export async function fetchDocuments(ownerId: string): Promise<DocumentUpload[]> {
  const { data, error } = await supabase
    .from("document_uploads")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DocumentUpload[];
}

export async function createDocumentRecord(
  input: Pick<
    TablesInsert<"document_uploads">,
    "owner_id" | "doc_type" | "storage_path" | "file_name"
  >,
): Promise<DocumentUpload> {
  const { data, error } = await supabase
    .from("document_uploads")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data as DocumentUpload;
}

export async function deleteDocument(id: string, storagePath: string) {
  const { error: storageError } = await supabase.storage
    .from("documents")
    .remove([storagePath]);
  if (storageError) throw storageError;

  const { error } = await supabase
    .from("document_uploads")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function getDocumentSignedUrl(
  storagePath: string,
  expiresInSeconds = 60,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) throw error;
  return data.signedUrl;
}

/**
 * Upload a file to the 'documents' bucket at path `<user_id>/<file_name>`
 * matching the storage RLS policy. Accepts either a Blob or an object with
 * uri (for React Native fetched via URI).
 */
export async function uploadDocumentFile(
  userId: string,
  fileName: string,
  file: Blob | ArrayBuffer,
  contentType: string,
): Promise<string> {
  const path = `${userId}/${Date.now()}-${fileName}`;
  const { error } = await supabase.storage
    .from("documents")
    .upload(path, file, { contentType, upsert: false });

  if (error) throw error;
  return path;
}
