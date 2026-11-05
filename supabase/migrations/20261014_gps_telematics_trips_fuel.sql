-- ====================================================================
-- NOOR FLEET & WORKSHOP MANAGEMENT SYSTEM - SUPABASE EXTENSION
-- Module: GPS Vehicle Tracking, Trip Management & Fuel Consumption Monitoring
-- Version: 2.0 (Strictly Additive - Preserves all existing tables and data)
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. EXTENSION ENUMS (SAFE & ADDITIVE)
-- --------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE gps_data_source AS ENUM (
    'LIVE_PROVIDER',
    'SIMULATED_MOCK_FOR_DEV_ONLY',
    'MANUAL_ODOMETER_ENTRY'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE trip_status AS ENUM (
    'PLANNED',
    'DISPATCHED',
    'IN_PROGRESS',
    'ARRIVED_AT_DESTINATION',
    'UNLOADING',
    'COMPLETED',
    'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE distance_calc_method AS ENUM (
    'GPS_HAVERSINE_SUMMATION',
    'GPS_VINCENTY_ROAD_FILTERED',
    'ODOMETER_DELTA',
    'HYBRID_VERIFIED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE data_quality_status AS ENUM (
    'HIGH_CONFIDENCE',
    'INTERPOLATED_GAPS',
    'ODOMETER_FALLBACK',
    'DEGRADED_SIGNAL',
    'ANOMALY_FLAGGED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sync_status_type AS ENUM (
    'SUCCESS',
    'PARTIAL_SUCCESS',
    'FAILED',
    'SKIPPED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE fuel_payment_method AS ENUM (
    'PETROMIN_CARD',
    'ARAMCO_BULK_DISPENSER',
    'COMPANY_FLEET_CARD',
    'CASH_REIMBURSEMENT',
    'WORKSHOP_INTERNAL_DISPENSER'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- --------------------------------------------------------------------
-- 2. GPS DEVICES MASTER REGISTRY
-- --------------------------------------------------------------------
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

-- --------------------------------------------------------------------
-- 3. GPS POSITIONS & TELEMATICS PINGS (TIME-SERIES)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicle_gps_pings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID REFERENCES gps_devices(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  speed_kmh DECIMAL(5, 2) DEFAULT 0.00,
  heading_degrees DECIMAL(5, 2) DEFAULT 0.00,
  altitude_meters DECIMAL(7, 2),
  ignition_on BOOLEAN NOT NULL DEFAULT FALSE,
  odometer_km INTEGER,
  gps_timestamp TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  accuracy_meters DECIMAL(6, 2) DEFAULT 10.0,
  is_valid_point BOOLEAN DEFAULT TRUE,
  data_source gps_data_source NOT NULL DEFAULT 'LIVE_PROVIDER',
  sync_batch_id UUID,
  raw_telematics JSONB,
  
  -- Anti-duplication guarantee: Unique timestamp per device ping
  CONSTRAINT uq_device_timestamp UNIQUE (device_id, gps_timestamp)
);

-- --------------------------------------------------------------------
-- 4. GPS SYNCHRONIZATION LOGS & DIAGNOSTICS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gps_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sync_completed_at TIMESTAMPTZ,
  provider_name TEXT NOT NULL,
  sync_status sync_status_type NOT NULL DEFAULT 'SUCCESS',
  pings_received INTEGER DEFAULT 0,
  pings_inserted INTEGER DEFAULT 0,
  pings_skipped_duplicate INTEGER DEFAULT 0,
  pings_rejected_anomaly INTEGER DEFAULT 0,
  error_message TEXT,
  api_latency_ms INTEGER,
  triggered_by TEXT DEFAULT 'SCHEDULED_CRON' -- 'SCHEDULED_CRON', 'MANUAL_REFRESH', 'WEBHOOK'
);

-- --------------------------------------------------------------------
-- 5. TRIPS & DISPATCH MANAGEMENT
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_number TEXT UNIQUE NOT NULL, -- Auto TRIP-YYYY-XXXXXX
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  assigned_driver_id UUID REFERENCES drivers(id) ON DELETE RESTRICT,
  assigned_trailer_id UUID REFERENCES trailers(id) ON DELETE SET NULL,
  
  -- Route Metadata
  origin_name TEXT NOT NULL,
  origin_latitude DECIMAL(10, 7),
  origin_longitude DECIMAL(10, 7),
  destination_name TEXT NOT NULL,
  destination_latitude DECIMAL(10, 7),
  destination_longitude DECIMAL(10, 7),
  
  -- Cargo and Load Status
  cargo_description TEXT DEFAULT 'Diesel / Fuel Transport',
  cargo_volume_liters INTEGER,
  is_loaded_trip BOOLEAN DEFAULT TRUE, -- TRUE = Loaded Tanker, FALSE = Empty Return
  
  -- Dispatch Timestamps
  planned_departure TIMESTAMPTZ,
  actual_departure TIMESTAMPTZ,
  planned_arrival TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,
  
  -- Distance Metrics
  start_odometer_km INTEGER,
  end_odometer_km INTEGER,
  odometer_distance_km INTEGER GENERATED ALWAYS AS (
    CASE WHEN end_odometer_km >= start_odometer_km 
         THEN end_odometer_km - start_odometer_km 
         ELSE NULL END
  ) STORED,
  gps_calculated_distance_km DECIMAL(10, 2) DEFAULT 0.00,
  final_distance_km DECIMAL(10, 2),
  distance_calculation_method distance_calc_method DEFAULT 'GPS_HAVERSINE_SUMMATION',
  data_quality data_quality_status DEFAULT 'HIGH_CONFIDENCE',
  
  -- Trip State & Status
  status trip_status NOT NULL DEFAULT 'PLANNED',
  notes TEXT,
  dispatched_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 6. VEHICLE FUEL CONSUMPTION BENCHMARKS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicle_fuel_benchmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  vehicle_type vehicle_type DEFAULT 'TRACTOR_HEAD',
  make TEXT,
  model TEXT,
  empty_consumption_liters_per_100km DECIMAL(5, 2) NOT NULL DEFAULT 34.00,
  loaded_consumption_liters_per_100km DECIMAL(5, 2) NOT NULL DEFAULT 56.00,
  pto_pumping_consumption_liters_per_hour DECIMAL(5, 2) DEFAULT 4.50,
  ac_summer_penalty_percentage DECIMAL(4, 2) DEFAULT 8.00,
  effective_from DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 7. ACTUAL FUEL TRANSACTIONS (RECEIPTS & DISPENSER ENTRIES)