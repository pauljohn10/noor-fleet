-- ==============================================================================
-- Migration: 20261115_document_attachments_storage.sql
-- Purpose: Ensure the `document-attachments` Supabase Storage bucket exists for
--          Istimara, Insurance, and Permit Expiry scans, with proper RLS policies
--          and non-destructive preservation of `vehicle_documents.attachment_url`.
-- ==============================================================================

-- 1. Ensure `document-attachments` bucket exists and is public-readable for previews/downloads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'document-attachments',
  'document-attachments',
  true,
  10485760, -- 10 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage Object Policies for `document-attachments`
DROP POLICY IF EXISTS "Public Document Attachments Read" ON storage.objects;
CREATE POLICY "Public Document Attachments Read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'document-attachments');

DROP POLICY IF EXISTS "Staff Document Attachments Upload" ON storage.objects;
CREATE POLICY "Staff Document Attachments Upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'document-attachments');

DROP POLICY IF EXISTS "Staff Document Attachments Update" ON storage.objects;
CREATE POLICY "Staff Document Attachments Update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'document-attachments')
  WITH CHECK (bucket_id = 'document-attachments');

DROP POLICY IF EXISTS "Super Admin Document Attachments Delete" ON storage.objects;
CREATE POLICY "Super Admin Document Attachments Delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'document-attachments'
    AND public.get_current_user_role() = 'SUPER_ADMIN'
  );

-- 3. Ensure `vehicle_documents.attachment_url` column exists and is preserved on updates
ALTER TABLE public.vehicle_documents
  ADD COLUMN IF NOT EXISTS attachment_url TEXT;

CREATE OR REPLACE FUNCTION public.preserve_vehicle_document_attachment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Preserve existing attachment_url if an update omits or sends an empty string
  IF (NEW.attachment_url IS NULL OR btrim(NEW.attachment_url) = '')
     AND OLD.attachment_url IS NOT NULL
     AND btrim(OLD.attachment_url) <> '' THEN
    NEW.attachment_url := OLD.attachment_url;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_preserve_vehicle_document_attachment ON public.vehicle_documents;
CREATE TRIGGER trg_preserve_vehicle_document_attachment
  BEFORE UPDATE ON public.vehicle_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.preserve_vehicle_document_attachment();
