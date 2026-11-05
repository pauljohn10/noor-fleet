-- ====================================================================
-- MIGRATION: PUBLIC DRIVER ISSUE REPORTING PORTAL
-- Date: 2026-10-31
-- Description:
--   1. Allows public (unauthenticated) driver issue submissions without
--      requiring a driver user account or driver_id UUID.
--   2. Adds plate_number, assigned_maintenance_team, internal_notes,
--      and updated_at columns to defect_reports.
--   3. Tightens RLS on defect_reports so public/anonymous users can NEVER
--      select or view any driver reports, while authenticated fleet/workshop
--      staff have full review and status management permissions.
--   4. Provides a secure SECURITY DEFINER RPC (submit_public_driver_report)
--      as an additional safe server-side submission pathway alongside the
--      submit-driver-report Edge Function.
-- ====================================================================

-- 1. Relax driver_id NOT NULL constraint for public link submissions
ALTER TABLE IF EXISTS defect_reports
  ALTER COLUMN driver_id DROP NOT NULL;

-- 2. Add columns for plate_number, maintenance team assignment, and internal notes
ALTER TABLE IF EXISTS defect_reports
  ADD COLUMN IF NOT EXISTS plate_number TEXT,
  ADD COLUMN IF NOT EXISTS assigned_maintenance_team TEXT,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Tighten Row Level Security (RLS) on defect_reports
ALTER TABLE defect_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Select Defect Reports Policy" ON defect_reports;
DROP POLICY IF EXISTS "Insert Defect Reports Policy" ON defect_reports;
DROP POLICY IF EXISTS "Update Defect Reports Policy" ON defect_reports;

-- Only authenticated staff can view reports; anonymous users cannot read any reports
CREATE POLICY "Authenticated Staff Select Defect Reports" ON defect_reports
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Authenticated staff can update status, internal notes, and maintenance team assignment
CREATE POLICY "Authenticated Staff Update Defect Reports" ON defect_reports
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Authenticated staff can insert manual reports
CREATE POLICY "Authenticated Staff Insert Defect Reports" ON defect_reports
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 4. Secure Server-Side RPC for Public Driver Report Submission
-- Validates input, links plate_number to existing vehicle record, and returns only
-- the new report reference number without exposing table rows to anon SELECT.
CREATE OR REPLACE FUNCTION submit_public_driver_report(
  p_driver_name TEXT,
  p_plate_number TEXT,
  p_category TEXT,
  p_description TEXT,
  p_photo_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_driver TEXT;
  v_clean_plate TEXT;
  v_clean_category TEXT;
  v_clean_desc TEXT;
  v_vehicle_code TEXT;
  v_trailer_code TEXT;
  v_driver_uuid UUID;
  v_seq INT;
  v_report_number TEXT;
  v_severity severity_level;
  v_created_at TIMESTAMPTZ := NOW();
BEGIN
  v_clean_driver := btrim(regexp_replace(COALESCE(p_driver_name, ''), '[<>]', '', 'g'));
  v_clean_plate := upper(btrim(regexp_replace(COALESCE(p_plate_number, ''), '[<>]', '', 'g')));
  v_clean_category := btrim(COALESCE(p_category, 'Other'));
  v_clean_desc := btrim(regexp_replace(COALESCE(p_description, ''), '[<>]', '', 'g'));

  IF char_length(v_clean_driver) < 2 OR char_length(v_clean_driver) > 120 THEN
    RAISE EXCEPTION 'Driver name must be between 2 and 120 characters.';
  END IF;

  IF char_length(v_clean_plate) < 2 OR char_length(v_clean_plate) > 40 THEN
    RAISE EXCEPTION 'Vehicle plate number is required.';
  END IF;

  IF v_clean_category NOT IN ('Mechanical', 'Electrical', 'Tire', 'Accident', 'Other', 'Engine', 'Brakes', 'Tires', 'Lights', 'Battery', 'Steering', 'Suspension', 'Fuel System', 'Tanker', 'Hose', 'Valve', 'Coupling', 'Safety Equipment') THEN
    v_clean_category := 'Other';
  END IF;

  IF char_length(v_clean_desc) < 5 OR char_length(v_clean_desc) > 2000 THEN
    RAISE EXCEPTION 'Issue description must be between 5 and 2000 characters.';
  END IF;

  -- Resolve vehicle by plate_number or vehicle_id (never creates duplicate vehicles)
  SELECT v.vehicle_id, t.trailer_id, v.assigned_driver_id
    INTO v_vehicle_code, v_trailer_code, v_driver_uuid
    FROM vehicles v
    LEFT JOIN trailers t ON t.id = v.assigned_trailer_id
   WHERE upper(v.plate_number) = v_clean_plate
      OR upper(v.vehicle_id) = v_clean_plate
   LIMIT 1;

  IF v_vehicle_code IS NULL THEN
    v_vehicle_code := v_clean_plate;
  END IF;

  -- Map category to default severity
  IF v_clean_category = 'Accident' THEN
    v_severity := 'CRITICAL';
  ELSIF v_clean_category IN ('Mechanical', 'Brakes', 'Engine', 'Steering') THEN
    v_severity := 'HIGH';
  ELSE
    v_severity := 'MEDIUM';
  END IF;

  SELECT COUNT(*) + 1 INTO v_seq FROM defect_reports;
  v_report_number := 'DEF-' || to_char(v_created_at, 'YYYY') || '-' || lpad(v_seq::TEXT, 5, '0');

  INSERT INTO defect_reports (
    report_number,
    driver_id,
    driver_name,
    vehicle_id,
    plate_number,
    trailer_id,
    category,
    severity,
    description,
    photo_url,
    status,
    created_at,
    updated_at
  ) VALUES (
    v_report_number,
    v_driver_uuid,
    v_clean_driver,
    v_vehicle_code,
    v_clean_plate,
    v_trailer_code,
    v_clean_category,
    v_severity,
    v_clean_desc,
    p_photo_url,
    'NEW',
    v_created_at,
    v_created_at
  );

  RETURN jsonb_build_object(
    'success', true,
    'report_number', v_report_number,
    'vehicle_id', v_vehicle_code,
    'plate_number', v_clean_plate,
    'submitted_at', v_created_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION submit_public_driver_report(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

