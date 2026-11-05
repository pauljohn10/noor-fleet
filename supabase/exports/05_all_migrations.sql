SET search_path = public, auth, extensions;

-- ==============================================================================
-- NOOR FLEET ERP — 05 ALL MIGRATIONS (CHRONOLOGICAL COMPILATION)
-- ==============================================================================
-- This file compiles all historical database migrations in exact execution order,
-- starting from baseline core schema (Migration 0) to current additive migrations.

-- ============================================================================
-- MIGRATION FILE: 20260101_initial_core_schema.sql (BASELINE SCHEMA)
-- ============================================================================
-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMERATED TYPES (CUSTOM TYPES)
DO $$
BEGIN
  -- Strictly 3 User Access Roles (Drivers use public reporting portal)
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'FLEET_MANAGER', 'MANAGEMENT');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_type') THEN
    CREATE TYPE vehicle_type AS ENUM ('TRACTOR_HEAD', 'RIGID_TRUCK', 'LIGHT_TRUCK', 'SERVICE_VAN');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_status') THEN
    CREATE TYPE vehicle_status AS ENUM ('AVAILABLE', 'ON_TRIP', 'IN_WORKSHOP', 'OUT_OF_SERVICE', 'SOLD', 'RETIRED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trailer_status') THEN
    CREATE TYPE trailer_status AS ENUM ('AVAILABLE', 'ASSIGNED', 'IN_WORKSHOP', 'OUT_OF_SERVICE', 'RETIRED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wo_priority') THEN
    CREATE TYPE wo_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wo_status') THEN
    CREATE TYPE wo_status AS ENUM ('REPORTED', 'SCHEDULED', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'CANCELLED', 'INVOICED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pm_frequency_type') THEN
    CREATE TYPE pm_frequency_type AS ENUM ('KM', 'HOURS', 'DAYS', 'CALENDAR');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pm_status') THEN
    CREATE TYPE pm_status AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'DUE', 'OVERDUE', 'COMPLETED', 'DEFERRED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inspection_result') THEN
    CREATE TYPE inspection_result AS ENUM ('PASS', 'FAIL', 'WARNING', 'NOT_APPLICABLE');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'severity_level') THEN
    CREATE TYPE severity_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_transaction_type') THEN
    CREATE TYPE inventory_transaction_type AS ENUM ('PURCHASE', 'ISSUE_TO_WO', 'TRANSFER', 'RETURN_FROM_WO', 'ADJUSTMENT_ADD', 'ADJUSTMENT_SUB');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gps_data_source') THEN
    CREATE TYPE gps_data_source AS ENUM ('HARDWARE_GPS', 'MOBILE_APP', 'MANUAL_ODOMETER');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trip_status') THEN
    CREATE TYPE trip_status AS ENUM ('DISPATCHED', 'IN_TRANSIT', 'ARRIVED_DESTINATION', 'RETURN_JOURNEY', 'COMPLETED', 'CANCELLED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'distance_calc_method') THEN
    CREATE TYPE distance_calc_method AS ENUM ('HAVERSINE_GPS', 'ODOMETER_CANBUS', 'MANUAL_LOG');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'data_quality_status') THEN
    CREATE TYPE data_quality_status AS ENUM ('VALID', 'ESTIMATED', 'OUTLIER', 'CORRUPT');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_status_type') THEN
    CREATE TYPE sync_status_type AS ENUM ('SUCCESS', 'PARTIAL_SUCCESS', 'AUTH_ERROR', 'NETWORK_TIMEOUT', 'PARSE_ERROR');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fuel_payment_method') THEN
    CREATE TYPE fuel_payment_method AS ENUM ('CORPORATE_RFID', 'FUEL_CARD', 'CASH_EXPENSE', 'DEPOT_TANK');
  END IF;
END $$;

-- ==============================================================================
-- 3. CORE SYSTEM & ENTITY TABLES
-- ==============================================================================

-- 3.1 USER PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'MANAGEMENT',
  department TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2 WORKSHOP DEPOTS & LOCATIONS
CREATE TABLE IF NOT EXISTS public.workshop_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  contact_phone TEXT,
  is_main_depot BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.3 SUPPLIERS & SERVICE VENDORS
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  tax_number TEXT,
  address TEXT,
  payment_terms_days INTEGER DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.4 DRIVERS ROSTER (Operational master records)
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  employee_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  license_number TEXT NOT NULL UNIQUE,
  license_type TEXT NOT NULL,
  license_expiry DATE NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ON_LEAVE')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.5 WORKSHOP TECHNICIANS & MECHANICS
CREATE TABLE IF NOT EXISTS public.technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  employee_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  specialization TEXT NOT NULL,
  phone TEXT NOT NULL,
  hourly_rate NUMERIC(10,2) DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.6 TRACTOR TRUCKS (PRIME MOVERS)
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id TEXT NOT NULL UNIQUE,
  plate_number TEXT NOT NULL UNIQUE,
  fleet_number TEXT NOT NULL UNIQUE,
  vehicle_type vehicle_type NOT NULL DEFAULT 'TRACTOR_HEAD',
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  vin TEXT NOT NULL UNIQUE,
  engine_number TEXT,
  color TEXT NOT NULL DEFAULT 'White / Yellow Stripe',
  fuel_type TEXT NOT NULL DEFAULT 'Diesel (Euro 5)',
  current_mileage NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  current_engine_hours NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  assigned_driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  assigned_trailer_id UUID, -- Foreign key created after trailers table
  department TEXT NOT NULL DEFAULT 'Fleet Operations',
  station_location TEXT NOT NULL DEFAULT 'Dammam Main Terminal',
  status vehicle_status NOT NULL DEFAULT 'AVAILABLE',
  purchase_date DATE,
  purchase_cost NUMERIC(14,2) DEFAULT 0.00,
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.7 TANKER TRAILERS
CREATE TABLE IF NOT EXISTS public.trailers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trailer_id TEXT NOT NULL UNIQUE,
  trailer_number TEXT NOT NULL UNIQUE,
  plate_number TEXT NOT NULL UNIQUE,
  tank_capacity_liters NUMERIC(10,2) NOT NULL DEFAULT 36000.00,
  number_of_compartments INTEGER NOT NULL DEFAULT 4,
  manufacturer TEXT NOT NULL DEFAULT 'Al-Mutlaq Tankers',
  model TEXT NOT NULL DEFAULT '36K-ALU-4C',
  year INTEGER NOT NULL DEFAULT 2023,
  vin TEXT NOT NULL UNIQUE,
  tank_type TEXT NOT NULL DEFAULT 'Aluminum Alloy Fuel Tanker',
  assigned_tractor_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  status trailer_status NOT NULL DEFAULT 'AVAILABLE',
  current_location TEXT NOT NULL DEFAULT 'Dammam Fuel Terminal',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add cross-reference from vehicles to trailers
ALTER TABLE public.vehicles
  DROP CONSTRAINT IF EXISTS fk_vehicles_trailers;
ALTER TABLE public.vehicles
  ADD CONSTRAINT fk_vehicles_trailers 
  FOREIGN KEY (assigned_trailer_id) REFERENCES public.trailers(id) ON DELETE SET NULL;

-- 3.8 HISTORICAL VEHICLE ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.vehicle_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  trailer_id UUID REFERENCES public.trailers(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  start_mileage NUMERIC(12,2) NOT NULL,
  end_mileage NUMERIC(12,2),
  assigned_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 4. TELEMATICS, GPS GATEWAY, TRIPS & FUEL MONITORING
-- ==============================================================================

-- 4.1 GPS TRACKING HARDWARE REGISTRY
CREATE TABLE IF NOT EXISTS public.gps_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_imei TEXT NOT NULL UNIQUE,
  serial_number TEXT,
  device_model TEXT NOT NULL DEFAULT 'Teltonika FMB120',
  sim_phone_number TEXT,
  sim_iccid TEXT,
  installed_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  installation_date DATE,
  installation_odometer NUMERIC(12,2) DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  battery_level_percent NUMERIC(5,2),
  signal_strength_csq INTEGER,
  last_heartbeat TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.2 HIGH-FREQUENCY TELEMETRY PINGS
CREATE TABLE IF NOT EXISTS public.vehicle_gps_pings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_id UUID REFERENCES public.gps_devices(id) ON DELETE SET NULL,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  altitude_m NUMERIC(8,2),
  speed_kmh NUMERIC(6,2) NOT NULL DEFAULT 0.00,
  heading_deg NUMERIC(5,2) DEFAULT 0.00,
  odometer_km NUMERIC(12,2),
  engine_rpm INTEGER,
  fuel_level_percent NUMERIC(5,2),
  ignition_on BOOLEAN NOT NULL DEFAULT FALSE,
  ping_timestamp TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.3 GPS SYNC LOGS (Edge Function telemetry batches)
CREATE TABLE IF NOT EXISTS public.gps_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_batch_id TEXT NOT NULL,
  sync_started_at TIMESTAMPTZ NOT NULL,
  sync_completed_at TIMESTAMPTZ,
  api_endpoint TEXT NOT NULL,
  http_status_code INTEGER,
  records_received INTEGER NOT NULL DEFAULT 0,
  pings_inserted INTEGER NOT NULL DEFAULT 0,
  pings_skipped_duplicate INTEGER NOT NULL DEFAULT 0,
  sync_status sync_status_type NOT NULL DEFAULT 'SUCCESS',
  error_message TEXT,
  api_latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.4 COMMERCIAL HAULAGE TRIPS
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_number TEXT NOT NULL UNIQUE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  trailer_id UUID REFERENCES public.trailers(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  origin_name TEXT NOT NULL,
  destination_name TEXT NOT NULL,
  planned_distance_km NUMERIC(10,2),
  actual_distance_km NUMERIC(10,2) DEFAULT 0.00,
  status trip_status NOT NULL DEFAULT 'DISPATCHED',
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  start_odometer NUMERIC(12,2),
  end_odometer NUMERIC(12,2),
  cargo_description TEXT DEFAULT 'Diesel / Petroleum Products',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.5 VEHICLE FUEL BENCHMARKS
CREATE TABLE IF NOT EXISTS public.vehicle_fuel_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  baseline_l_per_100km NUMERIC(6,2) NOT NULL,
  loaded_l_per_100km NUMERIC(6,2) NOT NULL,
  empty_l_per_100km NUMERIC(6,2) NOT NULL,
  allowed_variance_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.6 FUEL DISPENSING TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.fuel_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number TEXT NOT NULL UNIQUE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  fuel_station_name TEXT NOT NULL,
  fuel_station_city TEXT NOT NULL,
  fuel_type TEXT NOT NULL DEFAULT 'Diesel (Euro 5)',
  liters_dispensed NUMERIC(10,2) NOT NULL,
  cost_per_liter_sar NUMERIC(6,3) NOT NULL DEFAULT 1.150,
  total_cost_sar NUMERIC(12,2) NOT NULL,
  payment_method fuel_payment_method NOT NULL DEFAULT 'CORPORATE_RFID',
  odometer_at_fueling NUMERIC(12,2),
  invoice_reference TEXT,
  dispense_timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.7 TRIP-FUEL VARIANCE RECONCILIATIONS
CREATE TABLE IF NOT EXISTS public.trip_fuel_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL UNIQUE REFERENCES public.trips(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  total_gps_distance_km NUMERIC(10,2) NOT NULL,
  total_liters_consumed NUMERIC(10,2) NOT NULL,
  actual_l_per_100km NUMERIC(6,2) NOT NULL,
  expected_l_per_100km NUMERIC(6,2) NOT NULL,
  variance_percent NUMERIC(6,2) NOT NULL,
  variance_liters NUMERIC(10,2) NOT NULL,
  financial_impact_sar NUMERIC(12,2) NOT NULL,
  is_flagged_for_theft BOOLEAN NOT NULL DEFAULT FALSE,
  theft_probability_score NUMERIC(5,2) DEFAULT 0.00,
  investigation_status TEXT DEFAULT 'CLEARED' CHECK (investigation_status IN ('CLEARED', 'UNDER_REVIEW', 'CONFIRMED_PILFERAGE')),
  reconciliation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

-- ==============================================================================
-- 5. INVENTORY & SPARE PARTS STOREHOUSE
-- ==============================================================================

-- 5.1 PART CATEGORIES
CREATE TABLE IF NOT EXISTS public.part_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.2 SPARE PARTS CATALOG
CREATE TABLE IF NOT EXISTS public.parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number TEXT NOT NULL UNIQUE,
  part_name TEXT NOT NULL,
  category_id TEXT NOT NULL DEFAULT 'Engine & Filters',
  manufacturer TEXT,
  unit TEXT NOT NULL DEFAULT 'PCS',
  minimum_stock INTEGER NOT NULL DEFAULT 5,
  maximum_stock INTEGER NOT NULL DEFAULT 50,
  current_stock INTEGER NOT NULL DEFAULT 0,
  location_rack TEXT NOT NULL DEFAULT 'Rack A-01',
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'IN_STOCK' CHECK (status IN ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.3 INVENTORY STOCK TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE RESTRICT,
  transaction_type inventory_transaction_type NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  total_cost NUMERIC(14,2) NOT NULL,
  work_order_id UUID, -- Foreign key created after work_orders table
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  reference_number TEXT,
  performed_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 6. WORKSHOP & WORK ORDERS (JOB CARDS)
-- ==============================================================================

-- 6.1 WORK ORDERS
CREATE TABLE IF NOT EXISTS public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_number TEXT NOT NULL UNIQUE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  trailer_id UUID REFERENCES public.trailers(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  reported_by TEXT NOT NULL,
  problem_description TEXT NOT NULL,
  priority wo_priority NOT NULL DEFAULT 'MEDIUM',
  status wo_status NOT NULL DEFAULT 'REPORTED',
  workshop_location_id UUID REFERENCES public.workshop_locations(id) ON DELETE SET NULL,
  assigned_supervisor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_technician_id UUID REFERENCES public.technicians(id) ON DELETE SET NULL,
  estimated_completion TIMESTAMPTZ,
  actual_completion TIMESTAMPTZ,
  labor_hours NUMERIC(6,2) DEFAULT 0.00,
  labor_cost NUMERIC(12,2) DEFAULT 0.00,
  parts_cost NUMERIC(12,2) DEFAULT 0.00,
  total_cost NUMERIC(14,2) DEFAULT 0.00,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key constraint from inventory_transactions to work_orders
ALTER TABLE public.inventory_transactions
  DROP CONSTRAINT IF EXISTS fk_inventory_work_orders;
ALTER TABLE public.inventory_transactions
  ADD CONSTRAINT fk_inventory_work_orders
  FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) ON DELETE SET NULL;

-- 6.2 WORK ORDER STATUS AUDIT HISTORY
CREATE TABLE IF NOT EXISTS public.work_order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  from_status wo_status,
  to_status wo_status NOT NULL,
  changed_by UUID REFERENCES public.profiles(id),
  change_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6.3 PARTS CONSUMED IN WORK ORDERS
CREATE TABLE IF NOT EXISTS public.work_order_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL,
  total_price NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6.4 LABOR CHARGED IN WORK ORDERS
CREATE TABLE IF NOT EXISTS public.work_order_labor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES public.technicians(id) ON DELETE RESTRICT,
  hours_worked NUMERIC(6,2) NOT NULL CHECK (hours_worked > 0),
  hourly_rate NUMERIC(10,2) NOT NULL,
  total_cost NUMERIC(12,2) NOT NULL,
  task_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6.5 WORK ORDER REPAIR PHOTOS
CREATE TABLE IF NOT EXISTS public.work_order_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  photo_type TEXT DEFAULT 'BEFORE_REPAIR' CHECK (photo_type IN ('BEFORE_REPAIR', 'IN_PROGRESS', 'AFTER_REPAIR', 'DEFECT_PROOF')),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6.6 WORK ORDER ATTACHMENTS & RECEIPTS
CREATE TABLE IF NOT EXISTS public.work_order_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size_bytes BIGINT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 7. PREVENTIVE MAINTENANCE SCHEDULES
-- ==============================================================================

-- 7.1 MAINTENANCE TEMPLATES (Service types e.g. 10k Oil, 40k Brake Inspection)
CREATE TABLE IF NOT EXISTS public.maintenance_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  frequency_type pm_frequency_type NOT NULL DEFAULT 'KM',
  interval_value INTEGER NOT NULL,
  estimated_duration_hours NUMERIC(5,2) DEFAULT 2.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7.2 PREVENTIVE MAINTENANCE SCHEDULES
CREATE TABLE IF NOT EXISTS public.maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  trailer_id UUID REFERENCES public.trailers(id) ON DELETE CASCADE,
  frequency_type pm_frequency_type NOT NULL DEFAULT 'KM',
  frequency_value INTEGER NOT NULL,
  last_service_date DATE,
  last_service_km NUMERIC(12,2),
  next_due_date DATE,
  next_due_km NUMERIC(12,2),
  status pm_status NOT NULL DEFAULT 'SCHEDULED',
  assigned_technician_id UUID REFERENCES public.technicians(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 8. SAFETY INSPECTIONS & PUBLIC DRIVER DEFECT REPORTS
-- ==============================================================================

-- 8.1 VEHICLE SAFETY INSPECTIONS
CREATE TABLE IF NOT EXISTS public.vehicle_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_number TEXT NOT NULL UNIQUE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  trailer_id UUID REFERENCES public.trailers(id) ON DELETE SET NULL,
  inspector_name TEXT NOT NULL,
  odometer_reading NUMERIC(12,2) NOT NULL,
  overall_result inspection_result NOT NULL DEFAULT 'PASS',
  notes TEXT,
  inspected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8.2 INDIVIDUAL INSPECTION CHECKLIST ITEMS
CREATE TABLE IF NOT EXISTS public.vehicle_inspection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.vehicle_inspections(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  result inspection_result NOT NULL DEFAULT 'PASS',
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8.3 DEFECT REPORTS (Includes Public Driver Portal Submissions)
CREATE TABLE IF NOT EXISTS public.defect_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_number TEXT NOT NULL UNIQUE,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  driver_name TEXT NOT NULL,
  vehicle_id TEXT NOT NULL,
  plate_number TEXT,
  trailer_id TEXT,
  category TEXT NOT NULL,
  severity severity_level NOT NULL DEFAULT 'MEDIUM',
  description TEXT NOT NULL,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'ACKNOWLEDGED', 'WORK_ORDER_CREATED', 'RESOLVED', 'REJECTED')),
  assigned_maintenance_team TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 9. VEHICLE PERMITS, ISTIMARA REGISTER & COMPLIANCE
-- ==============================================================================

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

-- ==============================================================================
-- 10. SYSTEM NOTIFICATIONS & AUDIT TRAIL LOGS
-- ==============================================================================

-- 10.1 IN-APP NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'INFO' CHECK (type IN ('INFO', 'WARNING', 'ALERT', 'SUCCESS')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  link_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10.2 AUDIT TRAIL LOGS (Strictly Super Admin Exclusive)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  target_id TEXT,
  target_type TEXT,
  ip_address TEXT,
  details JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);



-- ============================================================================
-- MIGRATION FILE: 20261014_create_gps_devices.sql
-- ============================================================================

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
  installed_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
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
  DROP POLICY IF EXISTS "Read GPS Devices" ON gps_devices;
CREATE POLICY "Read GPS Devices" ON gps_devices 
    FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Manage GPS Devices" ON gps_devices;
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

-- ============================================================================
-- MIGRATION FILE: 20261014_gps_telematics_trips_fuel.sql
-- ============================================================================

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
  installed_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
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
  device_id UUID REFERENCES public.gps_devices(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
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
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  assigned_driver_id UUID REFERENCES public.drivers(id) ON DELETE RESTRICT,
  assigned_trailer_id UUID REFERENCES public.trailers(id) ON DELETE SET NULL,
  
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
  dispatched_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 6. VEHICLE FUEL CONSUMPTION BENCHMARKS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicle_fuel_benchmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
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

-- ============================================================================
-- MIGRATION FILE: 20261031_public_driver_issue_reporting.sql
-- ============================================================================

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
DROP POLICY IF EXISTS "Authenticated Staff Select Defect Reports" ON defect_reports;
CREATE POLICY "Authenticated Staff Select Defect Reports" ON defect_reports
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Authenticated staff can update status, internal notes, and maintenance team assignment
DROP POLICY IF EXISTS "Authenticated Staff Update Defect Reports" ON defect_reports;
CREATE POLICY "Authenticated Staff Update Defect Reports" ON defect_reports
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Authenticated staff can insert manual reports
DROP POLICY IF EXISTS "Authenticated Staff Insert Defect Reports" ON defect_reports;
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



-- ============================================================================
-- MIGRATION FILE: 20261101_enforce_three_roles_access_control.sql
-- ============================================================================

-- ====================================================================
-- NOOR FLEET — 3 ROLES ACCESS CONTROL & SUPABASE RLS SECURITY POLICY
-- 
-- The system strictly defines exactly 3 user roles:
--   1. SUPER_ADMIN   : Full system access, user provisioning & role management,
--                      all settings, audit trail logs, create/edit/delete/approve.
--   2. FLEET_MANAGER : Operational fleet management (vehicles, trailers, trips,
--                      GPS devices, defect reports, maintenance & work orders).
--                      No access to user provisioning or Super Admin audit logs.
--   3. MANAGEMENT    : Executive reporting, fleet metrics, maintenance KPIs.
--                      STRICTLY READ-ONLY BY DEFAULT on all operational tables.
--
-- Drivers access the system via the public reporting portal (/driver-report)
-- without any user account or credentials.
-- ====================================================================

-- 1. Helper Function: Extract current user role from profiles table
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role::text INTO v_role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;

  -- Fallback to JWT metadata if profiles record is not yet fetched
  IF v_role IS NULL THEN
    v_role := (auth.jwt() -> 'user_metadata' ->> 'role');
  END IF;

  RETURN COALESCE(v_role, 'MANAGEMENT');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Clean up any obsolete driver/legacy roles in profiles table
UPDATE public.profiles
SET role = 'FLEET_MANAGER'
WHERE role::text NOT IN ('SUPER_ADMIN', 'FLEET_MANAGER', 'MANAGEMENT');

-- 3. PROFILES TABLE ACCESS CONTROL
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles Read Policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Insert Policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Update Policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Delete Policy" ON public.profiles;
DROP POLICY IF EXISTS "Public Read Access" ON public.profiles;

-- All 3 authenticated roles can view user profiles
DROP POLICY IF EXISTS "Profiles Read Policy" ON public.profiles;
CREATE POLICY "Profiles Read Policy" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Only Super Admin can provision or register new user profiles
DROP POLICY IF EXISTS "Profiles Insert Policy" ON public.profiles;
CREATE POLICY "Profiles Insert Policy" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_current_user_role() = 'SUPER_ADMIN'
    OR auth.uid() = id -- allow self-registration trigger
  );

-- Only Super Admin can modify user profiles & roles (or user modifying own name/phone)
DROP POLICY IF EXISTS "Profiles Update Policy" ON public.profiles;
CREATE POLICY "Profiles Update Policy" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    get_current_user_role() = 'SUPER_ADMIN'
    OR auth.uid() = id
  )
  WITH CHECK (
    get_current_user_role() = 'SUPER_ADMIN'
    OR (auth.uid() = id AND role::text = (SELECT role::text FROM public.profiles WHERE id = auth.uid()))
  );

-- Only Super Admin can remove/delete user profiles
DROP POLICY IF EXISTS "Profiles Delete Policy" ON public.profiles;
CREATE POLICY "Profiles Delete Policy" ON public.profiles
  FOR DELETE
  TO authenticated
  USING (get_current_user_role() = 'SUPER_ADMIN');

-- 4. AUDIT LOGS SECURITY (Super Admin Exclusive)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Audit Logs Read Policy" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit Logs Insert Policy" ON public.audit_logs;
DROP POLICY IF EXISTS "Public Read Audit" ON public.audit_logs;

-- Strictly Super Admin can read the audit trail logs
DROP POLICY IF EXISTS "Audit Logs Read Policy" ON public.audit_logs;
CREATE POLICY "Audit Logs Read Policy" ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (get_current_user_role() = 'SUPER_ADMIN');

-- System & authenticated actions can insert audit entries
DROP POLICY IF EXISTS "Audit Logs Insert Policy" ON public.audit_logs;
CREATE POLICY "Audit Logs Insert Policy" ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 5. FLEET VEHICLES ACCESS CONTROL
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vehicles Read Policy" ON public.vehicles;
DROP POLICY IF EXISTS "Vehicles Write Policy" ON public.vehicles;
DROP POLICY IF EXISTS "Vehicles Delete Policy" ON public.vehicles;
DROP POLICY IF EXISTS "Public Read Vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated Insert Vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated Update Vehicles" ON public.vehicles;

-- Read: Super Admin, Fleet Management, Management
DROP POLICY IF EXISTS "Vehicles Read Policy" ON public.vehicles;
CREATE POLICY "Vehicles Read Policy" ON public.vehicles
  FOR SELECT
  TO authenticated
  USING (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER', 'MANAGEMENT'));

-- Insert/Update: Super Admin and Fleet Management only (Management is read-only)
DROP POLICY IF EXISTS "Vehicles Write Policy" ON public.vehicles;
CREATE POLICY "Vehicles Write Policy" ON public.vehicles
  FOR INSERT
  TO authenticated
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "Vehicles Update Policy" ON public.vehicles;
CREATE POLICY "Vehicles Update Policy" ON public.vehicles
  FOR UPDATE
  TO authenticated
  USING (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'))
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

-- Delete: Strictly Super Admin
DROP POLICY IF EXISTS "Vehicles Delete Policy" ON public.vehicles;
CREATE POLICY "Vehicles Delete Policy" ON public.vehicles
  FOR DELETE
  TO authenticated
  USING (get_current_user_role() = 'SUPER_ADMIN');

-- 6. TANKER TRAILERS ACCESS CONTROL
ALTER TABLE public.trailers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trailers Read Policy" ON public.trailers;
DROP POLICY IF EXISTS "Trailers Insert Policy" ON public.trailers;
DROP POLICY IF EXISTS "Trailers Update Policy" ON public.trailers;
DROP POLICY IF EXISTS "Trailers Delete Policy" ON public.trailers;
DROP POLICY IF EXISTS "Public Read Trailers" ON public.trailers;

DROP POLICY IF EXISTS "Trailers Read Policy" ON public.trailers;
CREATE POLICY "Trailers Read Policy" ON public.trailers
  FOR SELECT
  TO authenticated
  USING (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER', 'MANAGEMENT'));

DROP POLICY IF EXISTS "Trailers Insert Policy" ON public.trailers;
CREATE POLICY "Trailers Insert Policy" ON public.trailers
  FOR INSERT
  TO authenticated
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "Trailers Update Policy" ON public.trailers;
CREATE POLICY "Trailers Update Policy" ON public.trailers
  FOR UPDATE
  TO authenticated
  USING (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'))
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "Trailers Delete Policy" ON public.trailers;
CREATE POLICY "Trailers Delete Policy" ON public.trailers
  FOR DELETE
  TO authenticated
  USING (get_current_user_role() = 'SUPER_ADMIN');

-- 7. WORK ORDERS / MAINTENANCE ACCESS CONTROL
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "WorkOrders Read Policy" ON public.work_orders;
DROP POLICY IF EXISTS "WorkOrders Insert Policy" ON public.work_orders;
DROP POLICY IF EXISTS "WorkOrders Update Policy" ON public.work_orders;
DROP POLICY IF EXISTS "WorkOrders Delete Policy" ON public.work_orders;
DROP POLICY IF EXISTS "Public Read WorkOrders" ON public.work_orders;
DROP POLICY IF EXISTS "Authenticated Insert WorkOrders" ON public.work_orders;
DROP POLICY IF EXISTS "Authenticated Update WorkOrders" ON public.work_orders;

DROP POLICY IF EXISTS "WorkOrders Read Policy" ON public.work_orders;
CREATE POLICY "WorkOrders Read Policy" ON public.work_orders
  FOR SELECT
  TO authenticated
  USING (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER', 'MANAGEMENT'));

DROP POLICY IF EXISTS "WorkOrders Insert Policy" ON public.work_orders;
CREATE POLICY "WorkOrders Insert Policy" ON public.work_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "WorkOrders Update Policy" ON public.work_orders;
CREATE POLICY "WorkOrders Update Policy" ON public.work_orders
  FOR UPDATE
  TO authenticated
  USING (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'))
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "WorkOrders Delete Policy" ON public.work_orders;
CREATE POLICY "WorkOrders Delete Policy" ON public.work_orders
  FOR DELETE
  TO authenticated
  USING (get_current_user_role() = 'SUPER_ADMIN');

-- 8. SPARE PARTS & INVENTORY ACCESS CONTROL
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parts Read Policy" ON public.parts;
DROP POLICY IF EXISTS "Parts Insert Policy" ON public.parts;
DROP POLICY IF EXISTS "Parts Update Policy" ON public.parts;
DROP POLICY IF EXISTS "Parts Delete Policy" ON public.parts;
DROP POLICY IF EXISTS "Public Read Parts" ON public.parts;

DROP POLICY IF EXISTS "Parts Read Policy" ON public.parts;
CREATE POLICY "Parts Read Policy" ON public.parts
  FOR SELECT
  TO authenticated
  USING (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER', 'MANAGEMENT'));

DROP POLICY IF EXISTS "Parts Insert Policy" ON public.parts;
CREATE POLICY "Parts Insert Policy" ON public.parts
  FOR INSERT
  TO authenticated
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "Parts Update Policy" ON public.parts;
CREATE POLICY "Parts Update Policy" ON public.parts
  FOR UPDATE
  TO authenticated
  USING (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'))
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "Parts Delete Policy" ON public.parts;
CREATE POLICY "Parts Delete Policy" ON public.parts
  FOR DELETE
  TO authenticated
  USING (get_current_user_role() = 'SUPER_ADMIN');

-- 9. PREVENTIVE MAINTENANCE SCHEDULES ACCESS CONTROL
ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "PM Read Policy" ON public.maintenance_schedules;
DROP POLICY IF EXISTS "PM Insert Policy" ON public.maintenance_schedules;
DROP POLICY IF EXISTS "PM Update Policy" ON public.maintenance_schedules;
DROP POLICY IF EXISTS "PM Delete Policy" ON public.maintenance_schedules;

DROP POLICY IF EXISTS "PM Read Policy" ON public.maintenance_schedules;
CREATE POLICY "PM Read Policy" ON public.maintenance_schedules
  FOR SELECT
  TO authenticated
  USING (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER', 'MANAGEMENT'));

DROP POLICY IF EXISTS "PM Insert Policy" ON public.maintenance_schedules;
CREATE POLICY "PM Insert Policy" ON public.maintenance_schedules
  FOR INSERT
  TO authenticated
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "PM Update Policy" ON public.maintenance_schedules;
CREATE POLICY "PM Update Policy" ON public.maintenance_schedules
  FOR UPDATE
  TO authenticated
  USING (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'))
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "PM Delete Policy" ON public.maintenance_schedules;
CREATE POLICY "PM Delete Policy" ON public.maintenance_schedules
  FOR DELETE
  TO authenticated
  USING (get_current_user_role() = 'SUPER_ADMIN');

-- 10. DRIVER ISSUE / DEFECT REPORTS (Public submission + Staff review)
ALTER TABLE public.defect_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Defect Reports Select Policy" ON public.defect_reports;
DROP POLICY IF EXISTS "Defect Reports Insert Policy" ON public.defect_reports;
DROP POLICY IF EXISTS "Defect Reports Update Policy" ON public.defect_reports;
DROP POLICY IF EXISTS "Defect Reports Delete Policy" ON public.defect_reports;

-- Staff Read: All 3 roles can read defect reports
DROP POLICY IF EXISTS "Defect Reports Select Policy" ON public.defect_reports;
CREATE POLICY "Defect Reports Select Policy" ON public.defect_reports
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Submission: Both public anonymous drivers via portal and staff can insert
DROP POLICY IF EXISTS "Defect Reports Insert Policy" ON public.defect_reports;
CREATE POLICY "Defect Reports Insert Policy" ON public.defect_reports
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Update: Super Admin and Fleet Manager review and resolve (Management is read-only)
DROP POLICY IF EXISTS "Defect Reports Update Policy" ON public.defect_reports;
CREATE POLICY "Defect Reports Update Policy" ON public.defect_reports
  FOR UPDATE
  TO authenticated
  USING (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'))
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "Defect Reports Delete Policy" ON public.defect_reports;
CREATE POLICY "Defect Reports Delete Policy" ON public.defect_reports
  FOR DELETE
  TO authenticated
  USING (get_current_user_role() = 'SUPER_ADMIN');

-- 11. TRIPS & DISPATCH ACCESS CONTROL
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trips Read Policy" ON public.trips;
DROP POLICY IF EXISTS "Trips Insert Policy" ON public.trips;
DROP POLICY IF EXISTS "Trips Update Policy" ON public.trips;
DROP POLICY IF EXISTS "Trips Delete Policy" ON public.trips;

DROP POLICY IF EXISTS "Trips Read Policy" ON public.trips;
CREATE POLICY "Trips Read Policy" ON public.trips
  FOR SELECT
  TO authenticated
  USING (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER', 'MANAGEMENT'));

DROP POLICY IF EXISTS "Trips Insert Policy" ON public.trips;
CREATE POLICY "Trips Insert Policy" ON public.trips
  FOR INSERT
  TO authenticated
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "Trips Update Policy" ON public.trips;
CREATE POLICY "Trips Update Policy" ON public.trips
  FOR UPDATE
  TO authenticated
  USING (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'))
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "Trips Delete Policy" ON public.trips;
CREATE POLICY "Trips Delete Policy" ON public.trips
  FOR DELETE
  TO authenticated
  USING (get_current_user_role() = 'SUPER_ADMIN');

-- 12. GPS DEVICES & TELEMATICS REGISTRY ACCESS CONTROL
ALTER TABLE public.gps_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "GPS Read Policy" ON public.gps_devices;
DROP POLICY IF EXISTS "GPS Insert Policy" ON public.gps_devices;
DROP POLICY IF EXISTS "GPS Update Policy" ON public.gps_devices;
DROP POLICY IF EXISTS "GPS Delete Policy" ON public.gps_devices;

DROP POLICY IF EXISTS "GPS Read Policy" ON public.gps_devices;
CREATE POLICY "GPS Read Policy" ON public.gps_devices
  FOR SELECT
  TO authenticated
  USING (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER', 'MANAGEMENT'));

DROP POLICY IF EXISTS "GPS Insert Policy" ON public.gps_devices;
CREATE POLICY "GPS Insert Policy" ON public.gps_devices
  FOR INSERT
  TO authenticated
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "GPS Update Policy" ON public.gps_devices;
CREATE POLICY "GPS Update Policy" ON public.gps_devices
  FOR UPDATE
  TO authenticated
  USING (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'))
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "GPS Delete Policy" ON public.gps_devices;
CREATE POLICY "GPS Delete Policy" ON public.gps_devices
  FOR DELETE
  TO authenticated
  USING (get_current_user_role() = 'SUPER_ADMIN');



-- ============================================================================
-- MIGRATION FILE: 20261103_vehicle_documents_update_and_rls.sql
-- ============================================================================

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
DROP POLICY IF EXISTS "Documents Read Policy" ON public.vehicle_documents;
CREATE POLICY "Documents Read Policy" ON public.vehicle_documents
  FOR SELECT
  TO authenticated
  USING (
    get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER', 'MANAGEMENT')
    OR auth.role() = 'authenticated'
  );

-- Policy 2: Insert Access (Super Admin & Fleet Management)
DROP POLICY IF EXISTS "Documents Insert Policy" ON public.vehicle_documents;
CREATE POLICY "Documents Insert Policy" ON public.vehicle_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER')
    OR auth.role() = 'authenticated'
  );

-- Policy 3: Update / Renewal Access (Super Admin & Fleet Management only; Management is read-only)
DROP POLICY IF EXISTS "Documents Update Policy" ON public.vehicle_documents;
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
DROP POLICY IF EXISTS "Documents Delete Policy" ON public.vehicle_documents;
CREATE POLICY "Documents Delete Policy" ON public.vehicle_documents
  FOR DELETE
  TO authenticated
  USING (
    get_current_user_role() = 'SUPER_ADMIN'
  );


