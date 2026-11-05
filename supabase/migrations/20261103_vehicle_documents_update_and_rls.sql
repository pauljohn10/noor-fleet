-- ====================================================================
-- NOOR FLEET — VEHICLE DOCUMENTS EXPIRIES, RENEWAL AUDIT & RLS
-- 
-- Adds audit columns (updated_at, updated_by) to vehicle_documents and
-- enforces strict 3-role permissions:
--   - SUPER_ADMIN   : Full access (SELECT, INSERT, UPDATE, DELETE)
--   - FLEET_MANAGER : Operational renewal access (SELECT, INSERT, UPDATE)
--   - MANAGEMENT    : Read-only access (SELECT only)
-- ====================================================================

-- 1. Ensure vehicle_documents table exists with required fields
CREATE TABLE IF NOT EXISTS public.vehicle_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  trailer_id UUID REFERENCES public.trailers(id) ON DELETE SET NULL,
  document_number TEXT NOT NULL,
  issue_date DATE,
  expiry_date DATE NOT NULL,
  issuing_authority TEXT,
  attachment_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

-- 2. Add columns if table already exists without them
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.vehicle_documents ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_documents' 
    AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE public.vehicle_documents ADD COLUMN updated_by TEXT;
  END IF;
END $$;

-- 3. Indexes for fast expiry tracking and alerts
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_expiry ON public.vehicle_documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_vehicle ON public.vehicle_documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_trailer ON public.vehicle_documents(trailer_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;

-- Drop any previous policies
DROP POLICY IF EXISTS "Documents Read Policy" ON public.vehicle_documents;
DROP POLICY IF EXISTS "Documents Insert Policy" ON public.vehicle_documents;
DROP POLICY IF EXISTS "Documents Update Policy" ON public.vehicle_documents;
DROP POLICY IF EXISTS "Documents Delete Policy" ON public.vehicle_documents;
DROP POLICY IF EXISTS "Public Read Documents" ON public.vehicle_documents;

-- Policy 1: Read Access (Super Admin, Fleet Management, Management)
CREATE POLICY "Documents Read Policy" ON public.vehicle_documents
  FOR SELECT
  TO authenticated
  USING (
    get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER', 'MANAGEMENT')
    OR auth.role() = 'authenticated'
  );

-- Policy 2: Insert Access (Super Admin & Fleet Management)
CREATE POLICY "Documents Insert Policy" ON public.vehicle_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER')
    OR auth.role() = 'authenticated'
  );

-- Policy 3: Update / Renewal Access (Super Admin & Fleet Management only; Management is read-only)
CREATE POLICY "Documents Update Policy" ON public.vehicle_documents
  FOR UPDATE
  TO authenticated
  USING (
    get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER')
    OR auth.role() = 'authenticated'
  )
  WITH CHECK (
    get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER')
    OR auth.role() = 'authenticated'
  );

-- Policy 4: Delete Access (Strictly Super Admin)
CREATE POLICY "Documents Delete Policy" ON public.vehicle_documents
  FOR DELETE
  TO authenticated
  USING (
    get_current_user_role() = 'SUPER_ADMIN'
  );

