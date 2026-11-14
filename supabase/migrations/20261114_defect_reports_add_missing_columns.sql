-- ====================================================================
-- MIGRATION: Add missing columns to defect_reports
-- Date: 2026-11-14
-- Description:
--   The schema.sql reference had action_taken, workshop_response,
--   fleet_manager_notes and work_order_id defined but these were
--   never added to the live database via a migration.
--   This migration adds any missing columns safely with IF NOT EXISTS.
-- ====================================================================

ALTER TABLE defect_reports
  ADD COLUMN IF NOT EXISTS action_taken          TEXT,
  ADD COLUMN IF NOT EXISTS workshop_response     TEXT,
  ADD COLUMN IF NOT EXISTS fleet_manager_notes   TEXT,
  ADD COLUMN IF NOT EXISTS work_order_id         UUID;

-- Reload PostgREST schema cache so the columns are immediately visible
-- (This runs automatically on Supabase; included here for self-hosted setups)
NOTIFY pgrst, 'reload schema';
