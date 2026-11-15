-- ====================================================================
-- NOOR FLEET & WORKSHOP MANAGEMENT SYSTEM
-- Migration: Live GPS RLS Hardening & Realtime Publication
-- Strictly Additive - Preserves all existing tables, users, and records
-- ====================================================================

-- 1. Ensure performance index exists for latest ping per vehicle queries
CREATE INDEX IF NOT EXISTS idx_vehicle_gps_pings_vehicle_ts
  ON public.vehicle_gps_pings (vehicle_id, gps_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_gps_sync_logs_started_at
  ON public.gps_sync_logs (sync_started_at DESC);

-- 2. Enable Row Level Security on GPS telemetry & sync log tables
ALTER TABLE public.vehicle_gps_pings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_sync_logs ENABLE ROW LEVEL SECURITY;

-- 3. Drop any legacy permissive policies if present
DROP POLICY IF EXISTS "Allow authenticated read vehicle_gps_pings" ON public.vehicle_gps_pings;
DROP POLICY IF EXISTS "Allow authenticated read gps_sync_logs" ON public.gps_sync_logs;
DROP POLICY IF EXISTS "gps_pings_read_authenticated" ON public.vehicle_gps_pings;
DROP POLICY IF EXISTS "gps_sync_logs_read_authenticated" ON public.gps_sync_logs;

-- 4. Read-only access for active authenticated users
--    Writes (INSERT / UPDATE / DELETE) are intentionally NOT granted to client roles;
--    only the Supabase Edge Function using service_role may write GPS pings & sync logs.
CREATE POLICY "gps_pings_read_authenticated"
  ON public.vehicle_gps_pings
  FOR SELECT
  TO authenticated
  USING (public.can_read_authenticated());

CREATE POLICY "gps_sync_logs_read_authenticated"
  ON public.gps_sync_logs
  FOR SELECT
  TO authenticated
  USING (public.can_read_authenticated());

-- 5. Enable Supabase Realtime for live map & sync status auto-refresh
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_gps_pings;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.gps_devices;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.gps_sync_logs;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
