-- Together Platform — Storage Setup & RLS Policies
-- Migration: 20260707110812_storage_setup.sql
-- Creates the 'documents' private bucket and configures security policies for file uploads.

-- ============================================================
-- 1. CREATE STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,                          -- private bucket
  5242880,                        -- 5MB limit
  '{"image/jpeg", "image/png", "application/pdf"}'::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- 2. CREATE STORAGE RLS POLICIES
-- ============================================================

-- Ensure RLS is enabled on storage.objects (Pre-enabled on Cloud, skipping ALTER TABLE to avoid permission error)

-- Drop existing policies if any to prevent duplicates on rerun
DROP POLICY IF EXISTS "Allow owners to upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners to view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners to delete own documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to view all documents" ON storage.objects;

-- Allow authenticated users to upload documents to their own folder
-- Folder structure: documents/<user_id>/<file_name>
CREATE POLICY "Allow owners to upload documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (select auth.uid()::text) = (storage.foldername(name))[1]
  );

-- Allow owners to read their own uploaded documents
CREATE POLICY "Allow owners to view own documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (select auth.uid()::text) = (storage.foldername(name))[1]
  );

-- Allow owners to delete their own uploaded documents
CREATE POLICY "Allow owners to delete own documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (select auth.uid()::text) = (storage.foldername(name))[1]
  );

-- Allow admins to read all documents for verification
CREATE POLICY "Allow admins to view all documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND get_user_role() = 'admin'
  );
