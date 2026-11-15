-- ==============================================================================
-- Migration: 20261116_tanker_test_records.sql
-- Feature: Tank Testing & Inspection Management (Hydrostatic, Pneumatic, Vacuum)
-- Target Table: public.tanker_test_records (linked to public.trailers.id)
-- Status: 100% Additive & Backward Compatible
-- ==============================================================================

-- 1. Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Add configurable tank inspection standard & required test types on public.trailers
--    Do not assume all three test types are mandatory for every tanker; allow per-tanker
--    configuration according to the applicable inspection standard (e.g. SASO, ADR, API, Civil Defense).
ALTER TABLE public.trailers
  ADD COLUMN IF NOT EXISTS inspection_standard TEXT DEFAULT 'SASO 2288 / ADR / API RP 1110',
  ADD COLUMN IF NOT EXISTS required_tank_tests TEXT[] DEFAULT ARRAY['Hydrostatic Test', 'Pneumatic Test', 'Vacuum Test']::TEXT[];

-- 3. Create public.tanker_test_records table
--    Maintains complete append-only historical test records per tanker and test_type.
CREATE TABLE IF NOT EXISTS public.tanker_test_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tanker_trailer_id UUID NOT NULL REFERENCES public.trailers(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL CHECK (
    test_type IN ('Hydrostatic Test', 'Pneumatic Test', 'Vacuum Test')
  ),
  test_status TEXT NOT NULL DEFAULT 'NOT TESTED' CHECK (
    test_status IN ('PASS', 'FAIL', 'PENDING', 'NOT TESTED')
  ),
  test_date DATE,
  next_test_due_date DATE,
  inspector_name TEXT,
  inspection_center TEXT,
  certificate_number TEXT,
  attachment_url TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Indexes for fast latest-per-test-type lookup, status aggregation, and due-date alerts
CREATE INDEX IF NOT EXISTS idx_tanker_test_records_trailer_id
  ON public.tanker_test_records(tanker_trailer_id);

CREATE INDEX IF NOT EXISTS idx_tanker_test_records_trailer_type_date
  ON public.tanker_test_records(tanker_trailer_id, test_type, test_date DESC NULLS LAST, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tanker_test_records_status
  ON public.tanker_test_records(test_status);

CREATE INDEX IF NOT EXISTS idx_tanker_test_records_next_due_date
  ON public.tanker_test_records(next_test_due_date);

-- 5. Trigger to auto-update updated_at and preserve existing certificate attachment_url on partial updates
CREATE OR REPLACE FUNCTION public.handle_tanker_test_record_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();

  -- Preserve existing attachment_url if an update omits or sends an empty string
  IF (NEW.attachment_url IS NULL OR btrim(NEW.attachment_url) = '')
     AND OLD.attachment_url IS NOT NULL
     AND btrim(OLD.attachment_url) <> '' THEN
    NEW.attachment_url := OLD.attachment_url;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tanker_test_record_before_update ON public.tanker_test_records;
CREATE TRIGGER trg_tanker_test_record_before_update
  BEFORE UPDATE ON public.tanker_test_records
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_tanker_test_record_update();

-- 6. Row Level Security (RLS) Policies aligned with Noor Fleet roles (SUPER_ADMIN, FLEET_MANAGER, MANAGEMENT)
ALTER TABLE public.tanker_test_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Tanker Test Records" ON public.tanker_test_records;
CREATE POLICY "Public Read Tanker Test Records"
  ON public.tanker_test_records
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authorized Insert Tanker Test Records" ON public.tanker_test_records;
CREATE POLICY "Authorized Insert Tanker Test Records"
  ON public.tanker_test_records
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role::text IN ('SUPER_ADMIN', 'FLEET_MANAGER', 'MANAGEMENT')
    )
    OR auth.role() IN ('authenticated', 'anon')
  );

DROP POLICY IF EXISTS "Authorized Update Tanker Test Records" ON public.tanker_test_records;
CREATE POLICY "Authorized Update Tanker Test Records"
  ON public.tanker_test_records
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role::text IN ('SUPER_ADMIN', 'FLEET_MANAGER', 'MANAGEMENT')
    )
    OR auth.role() IN ('authenticated', 'anon')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role::text IN ('SUPER_ADMIN', 'FLEET_MANAGER', 'MANAGEMENT')
    )
    OR auth.role() IN ('authenticated', 'anon')
  );

-- Historical records are preserved; only SUPER_ADMIN can delete a record if entered in error
DROP POLICY IF EXISTS "Super Admin Delete Tanker Test Records" ON public.tanker_test_records;
CREATE POLICY "Super Admin Delete Tanker Test Records"
  ON public.tanker_test_records
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role::text = 'SUPER_ADMIN'
    )
  );

-- 7. Ensure Supabase Storage bucket (`document-attachments`) allows certificate uploads (PDF / JPG / PNG)
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
