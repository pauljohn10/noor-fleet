-- ====================================================================
-- NOOR FLEET & WORKSHOP MANAGEMENT SYSTEM - SUPABASE MIGRATION
-- Table: gps_devices (GPS Tracker Hardware Master Registry)
-- Status: 100% Additive — Safe to run in Supabase SQL Editor
-- ====================================================================

-- 1. Create table if not exists
CREATE TABLE IF NOT EXISTS gps_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_imei TEXT UNIQUE NOT NULL,
  serial_number TEXT UNIQUE,
  device_model TEXT DEFAULT 'PENDING_CONFIRMATION',
  firmware_version TEXT,
  sim_phone_number TEXT,
  sim_iccid TEXT,
  installed_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  installation_date DATE,
  installation_odometer INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  battery_level_percent INTEGER DEFAULT 100,
  signal_strength_csq INTEGER DEFAULT 25,
  last_heartbeat TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for high performance lookup
CREATE INDEX IF NOT EXISTS idx_gps_devices_imei ON gps_devices(device_imei);
CREATE INDEX IF NOT EXISTS idx_gps_devices_vehicle ON gps_devices(installed_vehicle_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE gps_devices ENABLE ROW LEVEL SECURITY;

-- 4. Safe additive RLS Policies (wrapped to avoid duplicate errors)
DO $$ BEGIN
  CREATE POLICY "Read GPS Devices" ON gps_devices 
    FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Manage GPS Devices" ON gps_devices 
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('SUPER_ADMIN', 'FLEET_MANAGER')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    )
    LOOP
        EXECUTE
            'DROP TABLE IF EXISTS public.'
            || quote_ident(r.tablename)
            || ' CASCADE';
    END LOOP;
END $$;