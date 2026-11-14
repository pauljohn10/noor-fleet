-- ====================================================================
-- MIGRATION: Fix defect_reports — add missing columns + fix status constraint
-- Date: 2026-11-14
-- Description:
--   1. Add columns that exist in schema.sql but were never migrated to live DB:
--      action_taken, workshop_response, fleet_manager_notes, work_order_id.
--   2. Drop the restrictive status CHECK constraint and replace it with one
--      that includes all values used by the app:
--      REPORTED, NEW, UNDER_REVIEW, IN_PROGRESS, WORK_ORDER_CREATED,
--      SCHEDULED, MORE_INFO_REQUESTED, RESOLVED, REJECTED, DUPLICATE.
-- ====================================================================

-- 1. Add missing columns
ALTER TABLE defect_reports
  ADD COLUMN IF NOT EXISTS action_taken          TEXT,
  ADD COLUMN IF NOT EXISTS workshop_response     TEXT,
  ADD COLUMN IF NOT EXISTS fleet_manager_notes   TEXT,
  ADD COLUMN IF NOT EXISTS work_order_id         UUID;

-- 2. Drop old restrictive status check constraint (name may vary)
ALTER TABLE defect_reports
  DROP CONSTRAINT IF EXISTS defect_reports_status_check;

-- 3. Add new constraint covering every value the app uses
ALTER TABLE defect_reports
  ADD CONSTRAINT defect_reports_status_check
  CHECK (status IN (
    'REPORTED',
    'NEW',
    'UNDER_REVIEW',
    'IN_PROGRESS',
    'WORK_ORDER_CREATED',
    'SCHEDULED',
    'MORE_INFO_REQUESTED',
    'RESOLVED',
    'REJECTED',
    'DUPLICATE'
  ));

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
