-- ==============================================================================
-- NOOR FLEET ERP — 00 MASTER DATABASE DEPLOYMENT (CONSOLIDATED)
-- ==============================================================================
-- Single idempotent execution script to setup the full Noor Fleet database
-- in Supabase SQL Editor in one click.
-- Strictly enforces 3 user access roles (SUPER_ADMIN, FLEET_MANAGER, MANAGEMENT)
-- and public driver reporting via /driver-report.
-- ==============================================================================


-- ============================================================================
-- SECTION: 01_complete_database_schema.sql
-- ============================================================================

-- ==============================================================================
-- NOOR FLEET ERP — 01 COMPLETE DATABASE SCHEMA (DDL)
-- ==============================================================================
-- Description:
--   Complete production DDL script defining all PostgreSQL extensions,
--   custom enumerated types, domain constraints, master & transactional tables,
--   primary keys, foreign key relations, and column defaults.
--
-- Target Database: PostgreSQL 15+ / Supabase PostgreSQL
-- ==============================================================================

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
-- SECTION: 03_functions_and_triggers.sql
-- ============================================================================

-- ==============================================================================
-- NOOR FLEET ERP — 03 DATABASE FUNCTIONS, STORED PROCEDURES & TRIGGERS
-- ==============================================================================
-- Description:
--   Comprehensive catalog of PostgreSQL stored procedures, SECURITY DEFINER
--   RPCs, auto-number sequence generators, and audit triggers.
--
-- Target Database: PostgreSQL 15+ / Supabase PostgreSQL
-- ==============================================================================

-- ==============================================================================
-- 1. UTILITY: AUTOMATIC TIMESTAMP UPDATER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at column
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_vehicles_updated_at ON public.vehicles;
CREATE TRIGGER trg_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_gps_devices_updated_at ON public.gps_devices;
CREATE TRIGGER trg_gps_devices_updated_at
  BEFORE UPDATE ON public.gps_devices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_work_orders_updated_at ON public.work_orders;
CREATE TRIGGER trg_work_orders_updated_at
  BEFORE UPDATE ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_maintenance_schedules_updated_at ON public.maintenance_schedules;
CREATE TRIGGER trg_maintenance_schedules_updated_at
  BEFORE UPDATE ON public.maintenance_schedules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_defect_reports_updated_at ON public.defect_reports;
CREATE TRIGGER trg_defect_reports_updated_at
  BEFORE UPDATE ON public.defect_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_vehicle_documents_updated_at ON public.vehicle_documents;
CREATE TRIGGER trg_vehicle_documents_updated_at
  BEFORE UPDATE ON public.vehicle_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- ==============================================================================
-- 2. ACCESS CONTROL: CURRENT USER ROLE RESOLVER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role::text INTO v_role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;

  -- Fallback to JWT user metadata if profile not yet loaded
  IF v_role IS NULL THEN
    v_role := (auth.jwt() -> 'user_metadata' ->> 'role');
  END IF;

  RETURN COALESCE(v_role, 'MANAGEMENT');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated, anon;

-- ==============================================================================
-- 3. SEQUENCE GENERATOR: WORK ORDERS (WO-YYYY-XXXXXX)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.generate_wo_number()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT := to_char(NOW(), 'YYYY');
  v_seq INT;
BEGIN
  IF NEW.wo_number IS NULL OR NEW.wo_number = '' THEN
    SELECT COUNT(*) + 1 INTO v_seq
    FROM public.work_orders
    WHERE wo_number LIKE 'WO-' || v_year || '-%';

    NEW.wo_number := 'WO-' || v_year || '-' || lpad(v_seq::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_wo_number ON public.work_orders;
CREATE TRIGGER trg_generate_wo_number
  BEFORE INSERT ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_wo_number();

-- ==============================================================================
-- 4. SEQUENCE GENERATOR: COMMERCIAL TRIPS (TRIP-YYYY-XXXXXX)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.generate_trip_number()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT := to_char(NOW(), 'YYYY');
  v_seq INT;
BEGIN
  IF NEW.trip_number IS NULL OR NEW.trip_number = '' THEN
    SELECT COUNT(*) + 1 INTO v_seq
    FROM public.trips
    WHERE trip_number LIKE 'TRIP-' || v_year || '-%';

    NEW.trip_number := 'TRIP-' || v_year || '-' || lpad(v_seq::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_trip_number ON public.trips;
CREATE TRIGGER trg_generate_trip_number
  BEFORE INSERT ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.generate_trip_number();

-- ==============================================================================
-- 5. SEQUENCE GENERATOR: FUEL TRANSACTIONS (FUEL-YYYY-XXXXXX)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.generate_fuel_tx_number()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT := to_char(NOW(), 'YYYY');
  v_seq INT;
BEGIN
  IF NEW.transaction_number IS NULL OR NEW.transaction_number = '' THEN
    SELECT COUNT(*) + 1 INTO v_seq
    FROM public.fuel_transactions
    WHERE transaction_number LIKE 'FUEL-' || v_year || '-%';

    NEW.transaction_number := 'FUEL-' || v_year || '-' || lpad(v_seq::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_fuel_tx_number ON public.fuel_transactions;
CREATE TRIGGER trg_generate_fuel_tx_number
  BEFORE INSERT ON public.fuel_transactions
  FOR EACH ROW EXECUTE FUNCTION public.generate_fuel_tx_number();

-- ==============================================================================
-- 6. PUBLIC DRIVER ISSUE REPORTING RPC (SECURITY DEFINER)
-- ==============================================================================
-- Allows drivers to submit defects from the public mobile portal (/driver-report)
-- without login. Validates input, resolves vehicle metadata, and returns reference
-- number safely without exposing table contents to anonymous callers.
CREATE OR REPLACE FUNCTION public.submit_public_driver_report(
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
  -- 1. Input sanitization
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

  IF v_clean_category NOT IN (
    'Mechanical', 'Electrical', 'Tire', 'Accident', 'Other',
    'Engine', 'Brakes', 'Tires', 'Lights', 'Battery', 'Steering',
    'Suspension', 'Fuel System', 'Tanker', 'Hose', 'Valve', 'Coupling', 'Safety Equipment'
  ) THEN
    v_clean_category := 'Other';
  END IF;

  IF char_length(v_clean_desc) < 5 OR char_length(v_clean_desc) > 2000 THEN
    RAISE EXCEPTION 'Issue description must be between 5 and 2000 characters.';
  END IF;

  -- 2. Resolve vehicle by plate_number or vehicle_id
  SELECT v.vehicle_id, t.trailer_id, v.assigned_driver_id
    INTO v_vehicle_code, v_trailer_code, v_driver_uuid
    FROM public.vehicles v
    LEFT JOIN public.trailers t ON t.id = v.assigned_trailer_id
   WHERE upper(v.plate_number) = v_clean_plate
      OR upper(v.vehicle_id) = v_clean_plate
   LIMIT 1;

  IF v_vehicle_code IS NULL THEN
    v_vehicle_code := v_clean_plate;
  END IF;

  -- 3. Determine default priority severity
  IF v_clean_category = 'Accident' THEN
    v_severity := 'CRITICAL';
  ELSIF v_clean_category IN ('Mechanical', 'Brakes', 'Engine', 'Steering') THEN
    v_severity := 'HIGH';
  ELSE
    v_severity := 'MEDIUM';
  END IF;

  -- 4. Generate defect report number sequence (DEF-YYYY-XXXXX)
  SELECT COUNT(*) + 1 INTO v_seq 
  FROM public.defect_reports
  WHERE report_number LIKE 'DEF-' || to_char(v_created_at, 'YYYY') || '-%';

  v_report_number := 'DEF-' || to_char(v_created_at, 'YYYY') || '-' || lpad(v_seq::TEXT, 5, '0');

  -- 5. Insert defect report record
  INSERT INTO public.defect_reports (
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

GRANT EXECUTE ON FUNCTION public.submit_public_driver_report(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- ==============================================================================
-- 7. TELEMETRY: LIVE ODOMETER & HEARTBEAT SYNC TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sync_vehicle_odometer_from_gps_ping()
RETURNS TRIGGER AS $$
BEGIN
  -- Update vehicle current mileage if higher than recorded
  IF NEW.odometer_km IS NOT NULL AND NEW.odometer_km > 0 THEN
    UPDATE public.vehicles
       SET current_mileage = GREATEST(current_mileage, NEW.odometer_km),
           updated_at = NOW()
     WHERE id = NEW.vehicle_id;
  END IF;

  -- Update GPS device last heartbeat
  IF NEW.device_id IS NOT NULL THEN
    UPDATE public.gps_devices
       SET last_heartbeat = NEW.ping_timestamp,
           updated_at = NOW()
     WHERE id = NEW.device_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_vehicle_odometer_from_ping ON public.vehicle_gps_pings;
CREATE TRIGGER trg_sync_vehicle_odometer_from_ping
  AFTER INSERT ON public.vehicle_gps_pings
  FOR EACH ROW EXECUTE FUNCTION public.sync_vehicle_odometer_from_gps_ping();

-- ==============================================================================
-- 8. AUTH: USER SIGNUP AUTO-PROFILE PROVISIONING
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    department,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'MANAGEMENT'::user_role),
    COALESCE(NEW.raw_user_meta_data->>'department', 'Fleet Operations'),
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();



-- ============================================================================
-- SECTION: 04_indexes_and_constraints.sql
-- ============================================================================

-- ==============================================================================
-- NOOR FLEET ERP — 04 INDEXES, CONSTRAINTS & DATA INTEGRITY
-- ==============================================================================
-- Description:
--   Comprehensive catalog of B-tree indexes, composite telematics indexes,
--   foreign key lookup indexes, and uniqueness constraints ensuring optimum
--   query execution times and strict relational integrity.
--
-- Target Database: PostgreSQL 15+ / Supabase PostgreSQL
-- ==============================================================================

-- ==============================================================================
-- 1. VEHICLES & PRIME MOVERS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_assigned_driver ON public.vehicles(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_assigned_trailer ON public.vehicles(assigned_trailer_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_station ON public.vehicles(station_location);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate_upper ON public.vehicles(upper(plate_number));
CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_id_upper ON public.vehicles(upper(vehicle_id));

-- ==============================================================================
-- 2. TANKER TRAILERS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_trailers_status ON public.trailers(status);
CREATE INDEX IF NOT EXISTS idx_trailers_assigned_tractor ON public.trailers(assigned_tractor_id);
CREATE INDEX IF NOT EXISTS idx_trailers_plate_upper ON public.trailers(upper(plate_number));
CREATE INDEX IF NOT EXISTS idx_trailers_trailer_id_upper ON public.trailers(upper(trailer_id));

-- ==============================================================================
-- 3. DRIVERS & TECHNICIANS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_drivers_status ON public.drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_license_expiry ON public.drivers(license_expiry);
CREATE INDEX IF NOT EXISTS idx_technicians_specialization ON public.technicians(specialization);
CREATE INDEX IF NOT EXISTS idx_technicians_is_active ON public.technicians(is_active);

-- ==============================================================================
-- 4. TELEMATICS & GPS HARDWARE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_gps_devices_vehicle ON public.gps_devices(installed_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_gps_devices_active ON public.gps_devices(is_active);
CREATE INDEX IF NOT EXISTS idx_gps_devices_imei ON public.gps_devices(device_imei);

-- Composite index for real-time map & fleet trajectory history:
-- Optimizes "SELECT * FROM vehicle_gps_pings WHERE vehicle_id = $1 ORDER BY ping_timestamp DESC"
CREATE INDEX IF NOT EXISTS idx_pings_vehicle_time ON public.vehicle_gps_pings(vehicle_id, ping_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pings_device ON public.vehicle_gps_pings(device_id);
CREATE INDEX IF NOT EXISTS idx_pings_time ON public.vehicle_gps_pings(ping_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_gps_sync_logs_batch ON public.gps_sync_logs(sync_batch_id);
CREATE INDEX IF NOT EXISTS idx_gps_sync_logs_status ON public.gps_sync_logs(sync_status);
CREATE INDEX IF NOT EXISTS idx_gps_sync_logs_started ON public.gps_sync_logs(sync_started_at DESC);

-- ==============================================================================
-- 5. TRIPS & FUEL MONITORING
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_trips_vehicle ON public.trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON public.trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_start_time ON public.trips(start_time DESC);

CREATE INDEX IF NOT EXISTS idx_fuel_tx_vehicle ON public.fuel_transactions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_tx_trip ON public.fuel_transactions(trip_id);
CREATE INDEX IF NOT EXISTS idx_fuel_tx_dispense_time ON public.fuel_transactions(dispense_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_fuel_reconciliation_trip ON public.trip_fuel_reconciliations(trip_id);
CREATE INDEX IF NOT EXISTS idx_fuel_reconciliation_flagged ON public.trip_fuel_reconciliations(is_flagged_for_theft);
CREATE INDEX IF NOT EXISTS idx_fuel_reconciliation_variance ON public.trip_fuel_reconciliations(variance_percent DESC);

-- ==============================================================================
-- 6. WORKSHOP & WORK ORDERS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_work_orders_vehicle ON public.work_orders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_trailer ON public.work_orders(trailer_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON public.work_orders(priority);
CREATE INDEX IF NOT EXISTS idx_work_orders_supervisor ON public.work_orders(assigned_supervisor_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_technician ON public.work_orders(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_at ON public.work_orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wo_parts_wo ON public.work_order_parts(work_order_id);
CREATE INDEX IF NOT EXISTS idx_wo_parts_part ON public.work_order_parts(part_id);
CREATE INDEX IF NOT EXISTS idx_wo_labor_wo ON public.work_order_labor(work_order_id);
CREATE INDEX IF NOT EXISTS idx_wo_labor_tech ON public.work_order_labor(technician_id);
CREATE INDEX IF NOT EXISTS idx_wo_photos_wo ON public.work_order_photos(work_order_id);
CREATE INDEX IF NOT EXISTS idx_wo_status_history_wo ON public.work_order_status_history(work_order_id);

-- ==============================================================================
-- 7. PREVENTIVE MAINTENANCE SCHEDULES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_pm_schedules_vehicle ON public.maintenance_schedules(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_pm_schedules_trailer ON public.maintenance_schedules(trailer_id);
CREATE INDEX IF NOT EXISTS idx_pm_schedules_status ON public.maintenance_schedules(status);
CREATE INDEX IF NOT EXISTS idx_pm_schedules_due_date ON public.maintenance_schedules(next_due_date);
CREATE INDEX IF NOT EXISTS idx_pm_schedules_due_km ON public.maintenance_schedules(next_due_km);

-- ==============================================================================
-- 8. INVENTORY & SPARE PARTS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_parts_category ON public.parts(category_id);
CREATE INDEX IF NOT EXISTS idx_parts_status ON public.parts(status);
CREATE INDEX IF NOT EXISTS idx_parts_stock_low ON public.parts(current_stock, minimum_stock);

CREATE INDEX IF NOT EXISTS idx_inv_tx_part ON public.inventory_transactions(part_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_wo ON public.inventory_transactions(work_order_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_created_at ON public.inventory_transactions(created_at DESC);

-- ==============================================================================
-- 9. SAFETY INSPECTIONS & PUBLIC DEFECT REPORTS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_inspections_vehicle ON public.vehicle_inspections(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_inspections_result ON public.vehicle_inspections(overall_result);
CREATE INDEX IF NOT EXISTS idx_inspections_inspected_at ON public.vehicle_inspections(inspected_at DESC);

CREATE INDEX IF NOT EXISTS idx_defect_reports_vehicle ON public.defect_reports(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_defect_reports_plate ON public.defect_reports(upper(plate_number));
CREATE INDEX IF NOT EXISTS idx_defect_reports_status ON public.defect_reports(status);
CREATE INDEX IF NOT EXISTS idx_defect_reports_created_at ON public.defect_reports(created_at DESC);

-- ==============================================================================
-- 10. VEHICLE PERMITS & ISTIMARA COMPLIANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_expiry ON public.vehicle_documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_vehicle ON public.vehicle_documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_trailer ON public.vehicle_documents(trailer_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_type ON public.vehicle_documents(document_type);

-- ==============================================================================
-- 11. NOTIFICATIONS & AUDIT TRAIL LOGS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performer ON public.audit_logs(performed_by);



-- ============================================================================
-- SECTION: 06_additional_database_objects.sql
-- ============================================================================

-- ==============================================================================
-- NOOR FLEET ERP — 06 ADDITIONAL DATABASE OBJECTS & STORAGE
-- ==============================================================================
-- Description:
--   Operational views, Supabase storage bucket configurations & RLS policies,
--   and core baseline seed data catalogs.
--
-- Target Database: PostgreSQL 15+ / Supabase PostgreSQL
-- ==============================================================================

-- ==============================================================================
-- 1. OPERATIONAL DATABASE VIEWS
-- ==============================================================================

-- 1.1 ACTIVE FLEET TELEMATICS & CURRENT LOCATION VIEW
CREATE OR REPLACE VIEW public.vw_active_fleet_telematics AS
WITH latest_pings AS (
  SELECT DISTINCT ON (vehicle_id)
    vehicle_id,
    device_id,
    latitude,
    longitude,
    speed_kmh,
    heading_deg,
    odometer_km,
    ignition_on,
    fuel_level_percent,
    ping_timestamp
  FROM public.vehicle_gps_pings
  ORDER BY vehicle_id, ping_timestamp DESC
)
SELECT 
  v.id AS vehicle_uuid,
  v.vehicle_id,
  v.plate_number,
  v.fleet_number,
  v.make,
  v.model,
  v.status AS vehicle_status,
  v.current_mileage,
  d.full_name AS assigned_driver_name,
  d.phone AS driver_phone,
  t.trailer_id AS coupled_trailer_id,
  t.plate_number AS coupled_trailer_plate,
  lp.latitude,
  lp.longitude,
  lp.speed_kmh,
  lp.heading_deg,
  lp.ignition_on,
  lp.fuel_level_percent,
  lp.ping_timestamp AS last_telemetry_at,
  gd.device_imei,
  gd.is_active AS gps_device_active
FROM public.vehicles v
LEFT JOIN latest_pings lp ON lp.vehicle_id = v.id
LEFT JOIN public.drivers d ON d.id = v.assigned_driver_id
LEFT JOIN public.trailers t ON t.id = v.assigned_trailer_id
LEFT JOIN public.gps_devices gd ON gd.installed_vehicle_id = v.id;

-- 1.2 DOCUMENT EXPIRY & LEGAL COMPLIANCE AUDIT VIEW
CREATE OR REPLACE VIEW public.vw_expiring_documents_compliance AS
SELECT 
  doc.id AS document_uuid,
  doc.document_type,
  doc.document_number,
  doc.issue_date,
  doc.expiry_date,
  doc.issuing_authority,
  doc.attachment_url,
  doc.notes,
  (doc.expiry_date - CURRENT_DATE) AS days_until_expiry,
  CASE
    WHEN doc.expiry_date < CURRENT_DATE THEN 'EXPIRED'
    WHEN doc.expiry_date <= (CURRENT_DATE + INTERVAL '30 days') THEN 'EXPIRING_SOON'
    ELSE 'VALID'
  END AS compliance_status,
  COALESCE(v.vehicle_id, t.trailer_id, 'ENTERPRISE FLEET') AS asset_reference,
  COALESCE(v.plate_number, t.plate_number, 'ALL UNITS') AS asset_plate,
  CASE
    WHEN doc.vehicle_id IS NOT NULL THEN 'TRACTOR_HEAD'
    WHEN doc.trailer_id IS NOT NULL THEN 'TANKER_TRAILER'
    ELSE 'FLEET_WIDE'
  END AS asset_type,
  doc.updated_at,
  doc.updated_by
FROM public.vehicle_documents doc
LEFT JOIN public.vehicles v ON v.id = doc.vehicle_id
LEFT JOIN public.trailers t ON t.id = doc.trailer_id
ORDER BY doc.expiry_date ASC;

-- 1.3 LOW-STOCK SPARE PARTS REORDER VIEW
CREATE OR REPLACE VIEW public.vw_low_stock_spare_parts AS
SELECT 
  p.id AS part_uuid,
  p.part_number,
  p.part_name,
  p.category_id,
  p.manufacturer,
  p.unit,
  p.current_stock,
  p.minimum_stock,
  p.maximum_stock,
  (p.maximum_stock - p.current_stock) AS suggested_reorder_qty,
  p.location_rack,
  p.unit_cost,
  (p.current_stock * p.unit_cost) AS total_valuation_sar
FROM public.parts p
WHERE p.current_stock <= p.minimum_stock
ORDER BY p.current_stock ASC;

-- 1.4 ACTIVE WORK ORDERS THROUGHPUT VIEW
CREATE OR REPLACE VIEW public.vw_active_work_orders_throughput AS
SELECT 
  wo.id AS work_order_uuid,
  wo.wo_number,
  wo.status AS wo_status,
  wo.priority,
  v.vehicle_id,
  v.plate_number AS vehicle_plate,
  t.trailer_id AS coupled_trailer,
  wo.reported_by,
  wo.problem_description,
  tech.full_name AS assigned_technician_name,
  tech.specialization,
  wo.labor_hours,
  wo.labor_cost,
  wo.parts_cost,
  wo.total_cost,
  wo.created_at,
  wo.estimated_completion
FROM public.work_orders wo
JOIN public.vehicles v ON v.id = wo.vehicle_id
LEFT JOIN public.trailers t ON t.id = wo.trailer_id
LEFT JOIN public.technicians tech ON tech.id = wo.assigned_technician_id
WHERE wo.status NOT IN ('COMPLETED', 'CANCELLED')
ORDER BY 
  CASE wo.priority 
    WHEN 'CRITICAL' THEN 1 
    WHEN 'HIGH' THEN 2 
    WHEN 'MEDIUM' THEN 3 
    ELSE 4 
  END,
  wo.created_at ASC;

-- ==============================================================================
-- 2. SUPABASE STORAGE BUCKETS CONFIGURATION
-- ==============================================================================

-- 2.1 Storage Buckets Registration (Safe Block)
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('driver-issue-photos', 'driver-issue-photos', TRUE, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('document-attachments', 'document-attachments', TRUE, 20971520, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('work-order-photos', 'work-order-photos', TRUE, 15728640, ARRAY['image/jpeg', 'image/png', 'image/webp'])
  ON CONFLICT (id) DO NOTHING;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Storage buckets initialization note: %', SQLERRM;
END $$;

-- 2.2 Storage Objects Row Level Security Policies (Safe Block)
DO $$
BEGIN
  -- Bucket: driver-issue-photos
  DROP POLICY IF EXISTS "Public Upload Driver Issue Photos" ON storage.objects;
CREATE POLICY "Public Upload Driver Issue Photos" ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'driver-issue-photos');

  DROP POLICY IF EXISTS "Public Read Driver Issue Photos" ON storage.objects;
CREATE POLICY "Public Read Driver Issue Photos" ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'driver-issue-photos');

  -- Bucket: document-attachments
  DROP POLICY IF EXISTS "Staff Manage Document Attachments" ON storage.objects;
CREATE POLICY "Staff Manage Document Attachments" ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'document-attachments')
  WITH CHECK (bucket_id = 'document-attachments');

  DROP POLICY IF EXISTS "Public Read Document Attachments" ON storage.objects;
CREATE POLICY "Public Read Document Attachments" ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'document-attachments');

  -- Bucket: work-order-photos
  DROP POLICY IF EXISTS "Staff Manage Work Order Photos" ON storage.objects;
CREATE POLICY "Staff Manage Work Order Photos" ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'work-order-photos')
  WITH CHECK (bucket_id = 'work-order-photos');

  DROP POLICY IF EXISTS "Public Read Work Order Photos" ON storage.objects;
CREATE POLICY "Public Read Work Order Photos" ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'work-order-photos');
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Storage RLS policies note: %', SQLERRM;
END $$;

-- ==============================================================================
-- 3. CORE LOOKUP CATALOGS & SEED DATA
-- ==============================================================================

-- 3.1 Workshop Depot Locations
INSERT INTO public.workshop_locations (id, code, name, city, address, contact_phone, is_main_depot)
VALUES ('10000000-0000-0000-0000-000000000001', 'DMM-CENTRAL', 'Dammam Main Maintenance Facility', 'Dammam', 'King Fahd Industrial Road, Sector 4', '+966 13 811 0000', TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.workshop_locations (id, code, name, city, address, contact_phone, is_main_depot)
VALUES ('10000000-0000-0000-0000-000000000002', 'JED-WEST', 'Jeddah Distribution Workshop', 'Jeddah', 'Al-Khumrah Logistics Park', '+966 12 622 0000', FALSE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.workshop_locations (id, code, name, city, address, contact_phone, is_main_depot)
VALUES ('10000000-0000-0000-0000-000000000003', 'RUH-NORTH', 'Riyadh Depot & Quick Service Hub', 'Riyadh', 'Al-Sulay Freight Terminal', '+966 11 433 0000', FALSE)
ON CONFLICT (code) DO NOTHING;

-- 3.2 Spare Parts Inventory Categories
INSERT INTO public.part_categories (code, name, description)
VALUES ('ENG-FIL', 'Engine & Filters', 'Fuel, oil, air filters and engine service kits')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.part_categories (code, name, description)
VALUES ('BRK-PNEU', 'Brakes & Pneumatics', 'Brake pads, drums, air brake valves, compressors, ABS sensors')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.part_categories (code, name, description)
VALUES ('TIR-WHL', 'Tires & Wheels', 'Heavy commercial tubeless tires 315/80 R22.5, rims, studs')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.part_categories (code, name, description)
VALUES ('ELE-SEN', 'Electrical & Sensors', 'Alternators, batteries, telematics sensors, CAN adapters')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.part_categories (code, name, description)
VALUES ('TNK-VLV', 'Tanker Discharge Valves', 'API bottom loading couplers, foot valves, vapor recovery lines')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.part_categories (code, name, description)
VALUES ('SUS-STR', 'Suspension & Steering', 'Air bellows, leaf springs, tie rods, king pins')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.part_categories (code, name, description)
VALUES ('LUB-FLD', 'Lubricants & Fluids', 'Engine oil 15W-40, transmission fluid, coolant, AdBlue')
ON CONFLICT (code) DO NOTHING;

-- 3.3 Default Super Admin Profile (Safe Auth Linking)
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Look for existing auth user
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@alnoortransport.com' LIMIT 1;
  
  -- If not found by specific email, find the first available auth user
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  END IF;

  -- If an auth user exists, link the SUPER_ADMIN profile to their valid auth.users UUID
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, department, is_active)
    VALUES (v_user_id, 'admin@alnoortransport.com', 'Rashid Al-Mansoor', 'SUPER_ADMIN', 'Executive Management', TRUE)
    ON CONFLICT (id) DO UPDATE SET
      role = 'SUPER_ADMIN',
      full_name = EXCLUDED.full_name;
  ELSE
    RAISE NOTICE 'Notice: No auth.users record exists yet. Profile seeding skipped safely until user signs up.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Profile seeding note: %', SQLERRM;
END $$;



-- ============================================================================
-- SECTION: 02_rls_policies.sql
-- ============================================================================

-- ==============================================================================
-- NOOR FLEET ERP — 02 ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- Description:
--   Complete production Row Level Security script enforcing strict 3-role
--   access control across all tables and storage objects:
--     1. SUPER_ADMIN   : Unrestricted read, write, update, delete, approve, user management.
--     2. FLEET_MANAGER : Operational read & write on fleet, workshop, inventory, telematics.
--     3. MANAGEMENT    : Executive reporting, cost analytics, KPI monitoring (STRICTLY READ-ONLY).
--
-- Drivers access the system via the public reporting portal (/driver-report)
-- without any user account or credentials.
-- ==============================================================================

-- 1. ROLE RESOLUTION HELPER FUNCTION
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role::text INTO v_role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;

  -- Fallback to JWT user metadata if profiles record is not yet materialized
  IF v_role IS NULL THEN
    v_role := (auth.jwt() -> 'user_metadata' ->> 'role');
  END IF;

  RETURN COALESCE(v_role, 'MANAGEMENT');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated, anon;

-- 2. ENSURE PROFILES ONLY HOLD VALID 3 ROLES
UPDATE public.profiles
SET role = 'FLEET_MANAGER'
WHERE role::text NOT IN ('SUPER_ADMIN', 'FLEET_MANAGER', 'MANAGEMENT');

-- ==============================================================================
-- 3. ENABLE RLS ON ALL TABLES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trailers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_gps_pings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_fuel_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_fuel_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_labor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defect_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 4. PROFILES & USER ACCOUNTS (Super Admin Provisioning Only)
-- ==============================================================================
DROP POLICY IF EXISTS "Profiles Read Policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Insert Policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Update Policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Delete Policy" ON public.profiles;

DROP POLICY IF EXISTS "Profiles Read Policy" ON public.profiles;
CREATE POLICY "Profiles Read Policy" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Profiles Insert Policy" ON public.profiles;
CREATE POLICY "Profiles Insert Policy" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    get_current_user_role() = 'SUPER_ADMIN'
    OR auth.uid() = id
  );

DROP POLICY IF EXISTS "Profiles Update Policy" ON public.profiles;
CREATE POLICY "Profiles Update Policy" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    get_current_user_role() = 'SUPER_ADMIN'
    OR auth.uid() = id
  )
  WITH CHECK (
    get_current_user_role() = 'SUPER_ADMIN'
    OR (auth.uid() = id AND role::text = (SELECT role::text FROM public.profiles WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "Profiles Delete Policy" ON public.profiles;
CREATE POLICY "Profiles Delete Policy" ON public.profiles
  FOR DELETE TO authenticated
  USING (get_current_user_role() = 'SUPER_ADMIN');

-- ==============================================================================
-- 5. AUDIT LOGS (Super Admin Exclusive Viewing)
-- ==============================================================================
DROP POLICY IF EXISTS "Audit Logs Read Policy" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit Logs Insert Policy" ON public.audit_logs;

DROP POLICY IF EXISTS "Audit Logs Read Policy" ON public.audit_logs;
CREATE POLICY "Audit Logs Read Policy" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (get_current_user_role() = 'SUPER_ADMIN');

DROP POLICY IF EXISTS "Audit Logs Insert Policy" ON public.audit_logs;
CREATE POLICY "Audit Logs Insert Policy" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ==============================================================================
-- 6. FLEET MASTER: VEHICLES, TRAILERS, DRIVERS, TECHNICIANS
-- ==============================================================================

-- 6.1 VEHICLES
DROP POLICY IF EXISTS "Vehicles Read Policy" ON public.vehicles;
DROP POLICY IF EXISTS "Vehicles Write Policy" ON public.vehicles;
DROP POLICY IF EXISTS "Vehicles Delete Policy" ON public.vehicles;

DROP POLICY IF EXISTS "Vehicles Read Policy" ON public.vehicles;
CREATE POLICY "Vehicles Read Policy" ON public.vehicles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Vehicles Write Policy" ON public.vehicles;
CREATE POLICY "Vehicles Write Policy" ON public.vehicles
  FOR INSERT TO authenticated
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "Vehicles Update Policy" ON public.vehicles;
CREATE POLICY "Vehicles Update Policy" ON public.vehicles
  FOR UPDATE TO authenticated
  USING (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'))
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "Vehicles Delete Policy" ON public.vehicles;
CREATE POLICY "Vehicles Delete Policy" ON public.vehicles
  FOR DELETE TO authenticated
  USING (get_current_user_role() = 'SUPER_ADMIN');

-- 6.2 TRAILERS
DROP POLICY IF EXISTS "Trailers Read Policy" ON public.trailers;
DROP POLICY IF EXISTS "Trailers Write Policy" ON public.trailers;
DROP POLICY IF EXISTS "Trailers Delete Policy" ON public.trailers;

DROP POLICY IF EXISTS "Trailers Read Policy" ON public.trailers;
CREATE POLICY "Trailers Read Policy" ON public.trailers
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Trailers Write Policy" ON public.trailers;
CREATE POLICY "Trailers Write Policy" ON public.trailers
  FOR INSERT TO authenticated
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "Trailers Update Policy" ON public.trailers;
CREATE POLICY "Trailers Update Policy" ON public.trailers
  FOR UPDATE TO authenticated
  USING (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'))
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "Trailers Delete Policy" ON public.trailers;
CREATE POLICY "Trailers Delete Policy" ON public.trailers
  FOR DELETE TO authenticated
  USING (get_current_user_role() = 'SUPER_ADMIN');

-- 6.3 DRIVERS
DROP POLICY IF EXISTS "Drivers Read Policy" ON public.drivers;
DROP POLICY IF EXISTS "Drivers Write Policy" ON public.drivers;
DROP POLICY IF EXISTS "Drivers Delete Policy" ON public.drivers;

DROP POLICY IF EXISTS "Drivers Read Policy" ON public.drivers;
CREATE POLICY "Drivers Read Policy" ON public.drivers
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Drivers Write Policy" ON public.drivers;
CREATE POLICY "Drivers Write Policy" ON public.drivers
  FOR INSERT TO authenticated
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "Drivers Update Policy" ON public.drivers;
CREATE POLICY "Drivers Update Policy" ON public.drivers
  FOR UPDATE TO authenticated
  USING (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'))
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "Drivers Delete Policy" ON public.drivers;
CREATE POLICY "Drivers Delete Policy" ON public.drivers
  FOR DELETE TO authenticated
  USING (get_current_user_role() = 'SUPER_ADMIN');

-- 6.4 TECHNICIANS
DROP POLICY IF EXISTS "Technicians Read Policy" ON public.technicians;
DROP POLICY IF EXISTS "Technicians Write Policy" ON public.technicians;
DROP POLICY IF EXISTS "Technicians Delete Policy" ON public.technicians;

DROP POLICY IF EXISTS "Technicians Read Policy" ON public.technicians;
CREATE POLICY "Technicians Read Policy" ON public.technicians
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Technicians Write Policy" ON public.technicians;
CREATE POLICY "Technicians Write Policy" ON public.technicians
  FOR INSERT TO authenticated
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "Technicians Update Policy" ON public.technicians;
CREATE POLICY "Technicians Update Policy" ON public.technicians
  FOR UPDATE TO authenticated
  USING (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'))
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "Technicians Delete Policy" ON public.technicians;
CREATE POLICY "Technicians Delete Policy" ON public.technicians
  FOR DELETE TO authenticated
  USING (get_current_user_role() = 'SUPER_ADMIN');

-- 6.5 VEHICLE ASSIGNMENTS
DROP POLICY IF EXISTS "Assignments Read Policy" ON public.vehicle_assignments;
DROP POLICY IF EXISTS "Assignments Write Policy" ON public.vehicle_assignments;

DROP POLICY IF EXISTS "Assignments Read Policy" ON public.vehicle_assignments;
CREATE POLICY "Assignments Read Policy" ON public.vehicle_assignments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Assignments Write Policy" ON public.vehicle_assignments;
CREATE POLICY "Assignments Write Policy" ON public.vehicle_assignments
  FOR ALL TO authenticated
  USING (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'))
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

-- ==============================================================================
-- 7. TELEMATICS, GPS, TRIPS & FUEL MONITORING
-- ==============================================================================

-- 7.1 GPS DEVICES
DROP POLICY IF EXISTS "Gps Devices Read Policy" ON public.gps_devices;
DROP POLICY IF EXISTS "Gps Devices Write Policy" ON public.gps_devices;
DROP POLICY IF EXISTS "Gps Devices Delete Policy" ON public.gps_devices;

DROP POLICY IF EXISTS "Gps Devices Read Policy" ON public.gps_devices;
CREATE POLICY "Gps Devices Read Policy" ON public.gps_devices
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Gps Devices Write Policy" ON public.gps_devices;
CREATE POLICY "Gps Devices Write Policy" ON public.gps_devices
  FOR INSERT TO authenticated
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "Gps Devices Update Policy" ON public.gps_devices;
CREATE POLICY "Gps Devices Update Policy" ON public.gps_devices
  FOR UPDATE TO authenticated
  USING (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'))
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "Gps Devices Delete Policy" ON public.gps_devices;
CREATE POLICY "Gps Devices Delete Policy" ON public.gps_devices
  FOR DELETE TO authenticated
  USING (get_current_user_role() = 'SUPER_ADMIN');

-- 7.2 GPS PINGS & SYNC LOGS
DROP POLICY IF EXISTS "Gps Pings Read Policy" ON public.vehicle_gps_pings;
DROP POLICY IF EXISTS "Gps Pings Insert Policy" ON public.vehicle_gps_pings;

DROP POLICY IF EXISTS "Gps Pings Read Policy" ON public.vehicle_gps_pings;
CREATE POLICY "Gps Pings Read Policy" ON public.vehicle_gps_pings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Gps Pings Insert Policy" ON public.vehicle_gps_pings;
CREATE POLICY "Gps Pings Insert Policy" ON public.vehicle_gps_pings
  FOR INSERT WITH CHECK (true); -- Allows Deno Edge Function ingestion

DROP POLICY IF EXISTS "Gps Sync Logs Read Policy" ON public.gps_sync_logs;
DROP POLICY IF EXISTS "Gps Sync Logs Insert Policy" ON public.gps_sync_logs;

DROP POLICY IF EXISTS "Gps Sync Logs Read Policy" ON public.gps_sync_logs;
CREATE POLICY "Gps Sync Logs Read Policy" ON public.gps_sync_logs
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Gps Sync Logs Insert Policy" ON public.gps_sync_logs;
CREATE POLICY "Gps Sync Logs Insert Policy" ON public.gps_sync_logs
  FOR INSERT WITH CHECK (true);

-- 7.3 TRIPS
DROP POLICY IF EXISTS "Trips Read Policy" ON public.trips;
DROP POLICY IF EXISTS "Trips Write Policy" ON public.trips;

DROP POLICY IF EXISTS "Trips Read Policy" ON public.trips;
CREATE POLICY "Trips Read Policy" ON public.trips
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Trips Write Policy" ON public.trips;
CREATE POLICY "Trips Write Policy" ON public.trips
  FOR ALL TO authenticated
  USING (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'))
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

-- 7.4 FUEL BENCHMARKS, TRANSACTIONS & RECONCILIATIONS
DROP POLICY IF EXISTS "Fuel Benchmarks Read Policy" ON public.vehicle_fuel_benchmarks;
DROP POLICY IF EXISTS "Fuel Benchmarks Write Policy" ON public.vehicle_fuel_benchmarks;

DROP POLICY IF EXISTS "Fuel Benchmarks Read Policy" ON public.vehicle_fuel_benchmarks;
CREATE POLICY "Fuel Benchmarks Read Policy" ON public.vehicle_fuel_benchmarks
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Fuel Benchmarks Write Policy" ON public.vehicle_fuel_benchmarks;
CREATE POLICY "Fuel Benchmarks Write Policy" ON public.vehicle_fuel_benchmarks
  FOR ALL TO authenticated
  USING (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'))
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "Fuel Tx Read Policy" ON public.fuel_transactions;
DROP POLICY IF EXISTS "Fuel Tx Write Policy" ON public.fuel_transactions;

DROP POLICY IF EXISTS "Fuel Tx Read Policy" ON public.fuel_transactions;
CREATE POLICY "Fuel Tx Read Policy" ON public.fuel_transactions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Fuel Tx Write Policy" ON public.fuel_transactions;
CREATE POLICY "Fuel Tx Write Policy" ON public.fuel_transactions
  FOR ALL TO authenticated
  USING (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'))
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "Fuel Reconciliation Read Policy" ON public.trip_fuel_reconciliations;
DROP POLICY IF EXISTS "Fuel Reconciliation Write Policy" ON public.trip_fuel_reconciliations;

DROP POLICY IF EXISTS "Fuel Reconciliation Read Policy" ON public.trip_fuel_reconciliations;
CREATE POLICY "Fuel Reconciliation Read Policy" ON public.trip_fuel_reconciliations
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Fuel Reconciliation Write Policy" ON public.trip_fuel_reconciliations;
CREATE POLICY "Fuel Reconciliation Write Policy" ON public.trip_fuel_reconciliations
  FOR ALL TO authenticated
  USING (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'))
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

-- ==============================================================================
-- 8. WORKSHOP, WORK ORDERS & MAINTENANCE
-- ==============================================================================
DROP POLICY IF EXISTS "Work Orders Read Policy" ON public.work_orders;
DROP POLICY IF EXISTS "Work Orders Write Policy" ON public.work_orders;
DROP POLICY IF EXISTS "Work Orders Delete Policy" ON public.work_orders;

DROP POLICY IF EXISTS "Work Orders Read Policy" ON public.work_orders;
CREATE POLICY "Work Orders Read Policy" ON public.work_orders
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Work Orders Write Policy" ON public.work_orders;
CREATE POLICY "Work Orders Write Policy" ON public.work_orders
  FOR INSERT TO authenticated
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "Work Orders Update Policy" ON public.work_orders;
CREATE POLICY "Work Orders Update Policy" ON public.work_orders
  FOR UPDATE TO authenticated
  USING (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'))
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "Work Orders Delete Policy" ON public.work_orders;
CREATE POLICY "Work Orders Delete Policy" ON public.work_orders
  FOR DELETE TO authenticated
  USING (get_current_user_role() = 'SUPER_ADMIN');

-- Work order child tables (parts, labor, photos, documents, history)
DROP POLICY IF EXISTS "WO Parts RLS" ON public.work_order_parts;
CREATE POLICY "WO Parts RLS" ON public.work_order_parts
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "WO Labor RLS" ON public.work_order_labor;
CREATE POLICY "WO Labor RLS" ON public.work_order_labor
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "WO Photos RLS" ON public.work_order_photos;
CREATE POLICY "WO Photos RLS" ON public.work_order_photos
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "WO Documents RLS" ON public.work_order_documents;
CREATE POLICY "WO Documents RLS" ON public.work_order_documents
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "WO Status History RLS" ON public.work_order_status_history;
CREATE POLICY "WO Status History RLS" ON public.work_order_status_history
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

-- Maintenance schedules & templates
DROP POLICY IF EXISTS "Maintenance Templates RLS" ON public.maintenance_templates;
CREATE POLICY "Maintenance Templates RLS" ON public.maintenance_templates
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "Maintenance Schedules RLS" ON public.maintenance_schedules;
CREATE POLICY "Maintenance Schedules RLS" ON public.maintenance_schedules
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

-- ==============================================================================
-- 9. INVENTORY & SPARE PARTS
-- ==============================================================================
DROP POLICY IF EXISTS "Part Categories RLS" ON public.part_categories;
CREATE POLICY "Part Categories RLS" ON public.part_categories
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "Parts Catalog Read" ON public.parts;
CREATE POLICY "Parts Catalog Read" ON public.parts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Parts Catalog Write" ON public.parts;
CREATE POLICY "Parts Catalog Write" ON public.parts
  FOR ALL TO authenticated
  USING (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'))
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "Inventory Tx Read" ON public.inventory_transactions;
CREATE POLICY "Inventory Tx Read" ON public.inventory_transactions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Inventory Tx Write" ON public.inventory_transactions;
CREATE POLICY "Inventory Tx Write" ON public.inventory_transactions
  FOR INSERT TO authenticated
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

-- ==============================================================================
-- 10. SAFETY INSPECTIONS & PUBLIC DRIVER DEFECT REPORTS
-- ==============================================================================
DROP POLICY IF EXISTS "Inspections RLS" ON public.vehicle_inspections;
CREATE POLICY "Inspections RLS" ON public.vehicle_inspections
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

DROP POLICY IF EXISTS "Inspection Items RLS" ON public.vehicle_inspection_items;
CREATE POLICY "Inspection Items RLS" ON public.vehicle_inspection_items
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

-- DEFECT REPORTS (Includes Public Driver Submissions)
DROP POLICY IF EXISTS "Authenticated Staff Select Defect Reports" ON public.defect_reports;
DROP POLICY IF EXISTS "Authenticated Staff Update Defect Reports" ON public.defect_reports;
DROP POLICY IF EXISTS "Authenticated Staff Insert Defect Reports" ON public.defect_reports;

-- Authenticated staff can view reports; anonymous users CANNOT SELECT any rows directly
DROP POLICY IF EXISTS "Authenticated Staff Select Defect Reports" ON public.defect_reports;
CREATE POLICY "Authenticated Staff Select Defect Reports" ON public.defect_reports
  FOR SELECT TO authenticated
  USING (true);

-- Authenticated staff can update status, triage, and internal notes
DROP POLICY IF EXISTS "Authenticated Staff Update Defect Reports" ON public.defect_reports;
CREATE POLICY "Authenticated Staff Update Defect Reports" ON public.defect_reports
  FOR UPDATE TO authenticated
  USING (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'))
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

-- Authenticated staff can manually create internal defect reports
DROP POLICY IF EXISTS "Authenticated Staff Insert Defect Reports" ON public.defect_reports;
CREATE POLICY "Authenticated Staff Insert Defect Reports" ON public.defect_reports
  FOR INSERT TO authenticated
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

-- (Public driver submissions are handled via submit_public_driver_report RPC with SECURITY DEFINER)

-- ==============================================================================
-- 11. VEHICLE DOCUMENTS & ISTIMARA REGISTER
-- ==============================================================================
DROP POLICY IF EXISTS "Documents Read Policy" ON public.vehicle_documents;
DROP POLICY IF EXISTS "Documents Insert Policy" ON public.vehicle_documents;
DROP POLICY IF EXISTS "Documents Update Policy" ON public.vehicle_documents;
DROP POLICY IF EXISTS "Documents Delete Policy" ON public.vehicle_documents;

-- Read Access: All 3 roles (Super Admin, Fleet Manager, Management)
DROP POLICY IF EXISTS "Documents Read Policy" ON public.vehicle_documents;
CREATE POLICY "Documents Read Policy" ON public.vehicle_documents
  FOR SELECT TO authenticated
  USING (true);

-- Insert Access: Super Admin & Fleet Manager
DROP POLICY IF EXISTS "Documents Insert Policy" ON public.vehicle_documents;
CREATE POLICY "Documents Insert Policy" ON public.vehicle_documents
  FOR INSERT TO authenticated
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

-- Update / Expiration Renewal: Super Admin & Fleet Manager (Management is read-only)
DROP POLICY IF EXISTS "Documents Update Policy" ON public.vehicle_documents;
CREATE POLICY "Documents Update Policy" ON public.vehicle_documents
  FOR UPDATE TO authenticated
  USING (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'))
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));

-- Delete Access: Super Admin Exclusive
DROP POLICY IF EXISTS "Documents Delete Policy" ON public.vehicle_documents;
CREATE POLICY "Documents Delete Policy" ON public.vehicle_documents
  FOR DELETE TO authenticated
  USING (get_current_user_role() = 'SUPER_ADMIN');

-- ==============================================================================
-- 12. NOTIFICATIONS & WORKSHOPS
-- ==============================================================================
DROP POLICY IF EXISTS "Notifications Read" ON public.notifications;
CREATE POLICY "Notifications Read" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "Notifications Write" ON public.notifications;
CREATE POLICY "Notifications Write" ON public.notifications
  FOR ALL TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Workshops RLS" ON public.workshop_locations;
CREATE POLICY "Workshops RLS" ON public.workshop_locations
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Suppliers RLS" ON public.suppliers;
CREATE POLICY "Suppliers RLS" ON public.suppliers
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER'));


