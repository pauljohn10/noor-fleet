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

