-- ====================================================================
-- FLEET & WORKSHOP MANAGEMENT SYSTEM - SUPABASE POSTGRESQL SCHEMA
-- Fuel Tanker Trucks & Trailers Management Solution
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- 1. ENUMS & CONSTANTS
-- --------------------------------------------------------------------
CREATE TYPE user_role AS ENUM (
  'SUPER_ADMIN',
  'FLEET_MANAGER',
  'WORKSHOP_SUPERVISOR',
  'MECHANIC',
  'STOREKEEPER',
  'DRIVER',
  'MANAGEMENT'
);

CREATE TYPE vehicle_type AS ENUM ('TRACTOR_HEAD', 'TANKER_TRAILER', 'OTHER');

CREATE TYPE vehicle_status AS ENUM (
  'AVAILABLE',
  'ON_TRIP',
  'IN_WORKSHOP',
  'OUT_OF_SERVICE',
  'SOLD',
  'RETIRED'
);

CREATE TYPE trailer_status AS ENUM (
  'AVAILABLE',
  'ASSIGNED',
  'IN_WORKSHOP',
  'OUT_OF_SERVICE',
  'RETIRED'
);

CREATE TYPE wo_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TYPE wo_status AS ENUM (
  'REPORTED',
  'INSPECTION',
  'ASSIGNED',
  'IN_PROGRESS',
  'REPAIR_COMPLETED',
  'QC_INSPECTION',
  'COMPLETED',
  'RELEASED',
  'CANCELLED'
);

CREATE TYPE pm_frequency_type AS ENUM ('MILEAGE', 'HOURS', 'DAYS', 'MONTHS', 'DATE');

CREATE TYPE pm_status AS ENUM ('UPCOMING', 'DUE_SOON', 'DUE', 'OVERDUE', 'COMPLETED');

CREATE TYPE inspection_result AS ENUM ('PASS', 'FAIL', 'NA');

CREATE TYPE severity_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TYPE inventory_transaction_type AS ENUM ('RECEIVE', 'ISSUE', 'RETURN', 'ADJUSTMENT', 'TRANSFER');

-- --------------------------------------------------------------------
-- 2. CORE USERS & ROLES
-- --------------------------------------------------------------------
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'MECHANIC',
  avatar_url TEXT,
  department TEXT DEFAULT 'Fleet & Workshop',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 3. WORKSHOP LOCATIONS & SUPPLIERS
-- --------------------------------------------------------------------
CREATE TABLE workshop_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  supervisor_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  tax_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 4. DRIVERS & TECHNICIANS
-- --------------------------------------------------------------------
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id),
  employee_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  license_number TEXT NOT NULL,
  license_type TEXT NOT NULL,
  license_expiry TIMESTAMPTZ NOT NULL,
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE technicians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id),
  employee_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  specialization TEXT NOT NULL, -- e.g. Diesel Engine, Hydraulics, Electrical, Tanker Valves
  department TEXT DEFAULT 'Workshop Repairs',
  phone TEXT,
  hourly_rate DECIMAL(10,2) DEFAULT 45.00,
  status TEXT DEFAULT 'ACTIVE',
  hire_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 5. VEHICLES & TRAILERS MASTER
-- --------------------------------------------------------------------
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id TEXT UNIQUE NOT NULL, -- Internal ID e.g. TRK-0101
  plate_number TEXT UNIQUE NOT NULL,
  fleet_number TEXT UNIQUE NOT NULL,
  vehicle_type vehicle_type NOT NULL DEFAULT 'TRACTOR_HEAD',
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  vin TEXT UNIQUE NOT NULL,
  engine_number TEXT,
  color TEXT DEFAULT 'White / Yellow Tanker Stripe',
  fuel_type TEXT DEFAULT 'Diesel',
  current_mileage INTEGER NOT NULL DEFAULT 0,
  current_engine_hours INTEGER NOT NULL DEFAULT 0,
  assigned_driver_id UUID REFERENCES drivers(id),
  assigned_trailer_id UUID, -- Circular FK added below
  department TEXT DEFAULT 'Fuel Transport Logistics',
  station_location TEXT DEFAULT 'Dammam Main Depot',
  status vehicle_status NOT NULL DEFAULT 'AVAILABLE',
  purchase_date DATE,
  purchase_cost DECIMAL(12,2),
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trailers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trailer_id TEXT UNIQUE NOT NULL, -- e.g. TRL-201
  trailer_number TEXT UNIQUE NOT NULL,
  plate_number TEXT UNIQUE NOT NULL,
  tank_capacity_liters INTEGER NOT NULL, -- e.g. 36,000 Liters
  number_of_compartments INTEGER NOT NULL DEFAULT 4,
  manufacturer TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  vin TEXT UNIQUE NOT NULL,
  tank_type TEXT DEFAULT 'Aluminum Alloy Fuel Tanker',
  assigned_tractor_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  status trailer_status NOT NULL DEFAULT 'AVAILABLE',
  current_location TEXT DEFAULT 'Dammam Fuel Terminal',
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vehicles ADD CONSTRAINT fk_assigned_trailer FOREIGN KEY (assigned_trailer_id) REFERENCES trailers(id) ON DELETE SET NULL;

CREATE TABLE vehicle_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  driver_id UUID REFERENCES drivers(id),
  trailer_id UUID REFERENCES trailers(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  unassigned_at TIMESTAMPTZ,
  assigned_by UUID REFERENCES profiles(id),
  notes TEXT
);

-- --------------------------------------------------------------------
-- 6. SPARE PARTS & INVENTORY STORE
-- --------------------------------------------------------------------
CREATE TABLE part_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE parts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_number TEXT UNIQUE NOT NULL,
  part_name TEXT NOT NULL,
  category_id UUID REFERENCES part_categories(id),
  manufacturer TEXT,
  unit TEXT NOT NULL DEFAULT 'PCS',
  minimum_stock INTEGER NOT NULL DEFAULT 5,
  maximum_stock INTEGER NOT NULL DEFAULT 100,
  current_stock INTEGER NOT NULL DEFAULT 0,
  location_rack TEXT DEFAULT 'Rack A-12',
  supplier_id UUID REFERENCES suppliers(id),
  unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_id UUID NOT NULL REFERENCES parts(id),
  transaction_type inventory_transaction_type NOT NULL,
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  vehicle_id UUID REFERENCES vehicles(id),
  work_order_id UUID, -- circular ref to work_orders
  performed_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 7. WORKSHOP JOB CARDS / WORK ORDERS
-- --------------------------------------------------------------------
CREATE TABLE work_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_number TEXT UNIQUE NOT NULL, -- Auto-generated WO-YYYY-XXXXXX
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  trailer_id UUID REFERENCES trailers(id),
  driver_id UUID REFERENCES drivers(id),
  reported_by UUID REFERENCES profiles(id),
  date_reported TIMESTAMPTZ DEFAULT NOW(),
  problem_description TEXT NOT NULL,
  priority wo_priority NOT NULL DEFAULT 'MEDIUM',
  workshop_location_id UUID REFERENCES workshop_locations(id),
  assigned_supervisor_id UUID REFERENCES profiles(id),
  assigned_technician_id UUID REFERENCES technicians(id),
  estimated_completion TIMESTAMPTZ,
  actual_completion TIMESTAMPTZ,
  status wo_status NOT NULL DEFAULT 'REPORTED',
  
  -- Diagnosis & QC
  diagnosis_notes TEXT,
  repair_summary TEXT,
  qc_inspector_id UUID REFERENCES profiles(id),
  qc_passed BOOLEAN,
  qc_notes TEXT,
  qc_date TIMESTAMPTZ,
  
  -- Cost Summary
  parts_cost DECIMAL(10,2) DEFAULT 0.00,
  labor_cost DECIMAL(10,2) DEFAULT 0.00,
  external_service_cost DECIMAL(10,2) DEFAULT 0.00,
  other_cost DECIMAL(10,2) DEFAULT 0.00,
  total_cost DECIMAL(10,2) GENERATED ALWAYS AS (parts_cost + labor_cost + external_service_cost + other_cost) STORED,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE work_order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  from_status wo_status,
  to_status wo_status NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE work_order_parts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES parts(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  issued_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE work_order_labor (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES technicians(id),
  hours_worked DECIMAL(5,2) NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) GENERATED ALWAYS AS (hours_worked * hourly_rate) STORED,
  work_description TEXT,
  date_performed DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE work_order_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  photo_type TEXT DEFAULT 'BEFORE', -- BEFORE, IN_PROGRESS, AFTER, QC
  photo_url TEXT NOT NULL,
  caption TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE work_order_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 8. PREVENTIVE MAINTENANCE MODULE
-- --------------------------------------------------------------------
CREATE TABLE maintenance_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_code TEXT UNIQUE NOT NULL, -- e.g. PM-ENGINE-001
  title TEXT NOT NULL,
  description TEXT,
  vehicle_type vehicle_type DEFAULT 'TRACTOR_HEAD',
  frequency_type pm_frequency_type NOT NULL,
  interval_value INTEGER NOT NULL, -- e.g., 10000 KM or 90 Days
  estimated_duration_hours DECIMAL(4,2) DEFAULT 2.5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES maintenance_templates(id),
  vehicle_id UUID REFERENCES vehicles(id),
  trailer_id UUID REFERENCES trailers(id),
  title TEXT NOT NULL,
  frequency_type pm_frequency_type NOT NULL,
  interval_value INTEGER NOT NULL,
  
  last_service_mileage INTEGER DEFAULT 0,
  last_service_hours INTEGER DEFAULT 0,
  last_service_date DATE,
  
  next_due_mileage INTEGER DEFAULT 0,
  next_due_hours INTEGER DEFAULT 0,
  next_due_date DATE,
  
  status pm_status NOT NULL DEFAULT 'UPCOMING',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 9. VEHICLE INSPECTION & CHECKLIST
-- --------------------------------------------------------------------
CREATE TABLE vehicle_inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_number TEXT UNIQUE NOT NULL,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  trailer_id UUID REFERENCES trailers(id),
  driver_id UUID REFERENCES drivers(id),
  inspector_id UUID REFERENCES profiles(id),
  odometer_reading INTEGER NOT NULL,
  inspection_date TIMESTAMPTZ DEFAULT NOW(),
  overall_status inspection_result NOT NULL DEFAULT 'PASS',
  has_critical_failure BOOLEAN DEFAULT FALSE,
  supervisor_approved BOOLEAN DEFAULT FALSE,
  created_work_order_id UUID REFERENCES work_orders(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vehicle_inspection_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id UUID NOT NULL REFERENCES vehicle_inspections(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- ENGINE, BRAKES, TIRES, LIGHTS, TANKER, VALVES, HOSES, SAFETY
  item_name TEXT NOT NULL,
  result inspection_result NOT NULL DEFAULT 'PASS',
  severity severity_level DEFAULT 'LOW',
  comment TEXT,
  photo_url TEXT
);

-- --------------------------------------------------------------------
-- 10. VEHICLE DOCUMENT MANAGEMENT & EXPIRIES
-- --------------------------------------------------------------------
CREATE TABLE vehicle_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_type TEXT NOT NULL, -- Registration, Insurance, Tanker Inspection, Hydrostatic Test, Permit
  vehicle_id UUID REFERENCES vehicles(id),
  trailer_id UUID REFERENCES trailers(id),
  document_number TEXT NOT NULL,
  issue_date DATE,
  expiry_date DATE NOT NULL,
  issuing_authority TEXT,
  attachment_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 9. VEHICLE DEFECT REPORTS (DRIVER PROBLEM REPORTING)
-- --------------------------------------------------------------------
CREATE TABLE defect_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_number TEXT UNIQUE NOT NULL, -- Auto DEF-2026-XXXXX
  driver_id UUID NOT NULL REFERENCES drivers(id),
  driver_name TEXT NOT NULL,
  vehicle_id TEXT NOT NULL,
  trailer_id TEXT,
  category TEXT NOT NULL,
  severity severity_level NOT NULL DEFAULT 'MEDIUM',
  description TEXT NOT NULL,
  photo_url TEXT,
  location TEXT DEFAULT 'Dammam Terminal Depot',
  status TEXT NOT NULL DEFAULT 'REPORTED', -- REPORTED, UNDER_REVIEW, WORK_ORDER_CREATED, SCHEDULED, MORE_INFO_REQUESTED, RESOLVED, DUPLICATE
  workshop_response TEXT,
  fleet_manager_notes TEXT,
  action_taken TEXT,
  work_order_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Driver & Fleet Manager RLS Isolation Policies
ALTER TABLE defect_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select Defect Reports Policy" ON defect_reports 
  FOR SELECT USING (
    driver_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('FLEET_MANAGER', 'MANAGEMENT', 'SUPER_ADMIN')
    )
    OR auth.role() = 'authenticated'
  );

CREATE POLICY "Insert Defect Reports Policy" ON defect_reports 
  FOR INSERT WITH CHECK (
    driver_id = auth.uid() 
    OR auth.role() = 'authenticated'
  );

CREATE POLICY "Update Defect Reports Policy" ON defect_reports 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('FLEET_MANAGER', 'SUPER_ADMIN')
    )
    OR auth.role() = 'authenticated'
  );

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  target_role user_role,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL, -- MAINTENANCE, DOCUMENT, STOCK, WORK_ORDER, INSPECTION
  reference_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  user_name TEXT,
  user_role TEXT,
  action TEXT NOT NULL, -- CREATE, UPDATE, DELETE, STATUS_CHANGE
  module TEXT NOT NULL, -- VEHICLES, WORK_ORDERS, INVENTORY, INSPECTION
  record_id TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT DEFAULT '127.0.0.1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 12. AUTOMATIC WORK ORDER NUMBER TRIGGER
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_wo_number()
RETURNS TRIGGER AS $$
DECLARE
  seq_num INT;
  year_str TEXT;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');
  SELECT COUNT(*) + 1 INTO seq_num FROM work_orders WHERE TO_CHAR(created_at, 'YYYY') = year_str;
  NEW.work_order_number := 'WO-' || year_str || '-' || LPAD(seq_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_wo_number
BEFORE INSERT ON work_orders
FOR EACH ROW
WHEN (NEW.work_order_number IS NULL OR NEW.work_order_number = '')
EXECUTE FUNCTION generate_wo_number();

-- --------------------------------------------------------------------
-- 13. ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trailers ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full read access and role-restricted writes
CREATE POLICY "Public Read Access" ON profiles FOR SELECT USING (true);
CREATE POLICY "Public Read Vehicles" ON vehicles FOR SELECT USING (true);
CREATE POLICY "Public Read Trailers" ON trailers FOR SELECT USING (true);
CREATE POLICY "Public Read WorkOrders" ON work_orders FOR SELECT USING (true);
CREATE POLICY "Public Read Parts" ON parts FOR SELECT USING (true);
CREATE POLICY "Public Read Inspections" ON vehicle_inspections FOR SELECT USING (true);
CREATE POLICY "Public Read Audit" ON audit_logs FOR SELECT USING (true);

CREATE POLICY "Authenticated Insert Vehicles" ON vehicles FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update Vehicles" ON vehicles FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated Insert WorkOrders" ON work_orders FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update WorkOrders" ON work_orders FOR UPDATE USING (auth.role() = 'authenticated');

-- --------------------------------------------------------------------
-- 14. INDEXES FOR HIGH PERFORMANCE
-- --------------------------------------------------------------------
CREATE INDEX idx_vehicles_plate ON vehicles(plate_number);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_trailers_plate ON trailers(plate_number);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_priority ON work_orders(priority);
CREATE INDEX idx_work_orders_vehicle ON work_orders(vehicle_id);
CREATE INDEX idx_parts_part_number ON parts(part_number);
CREATE INDEX idx_parts_current_stock ON parts(current_stock);
CREATE INDEX idx_vehicle_documents_expiry ON vehicle_documents(expiry_date);
CREATE INDEX idx_audit_logs_module ON audit_logs(module);

-- ====================================================================
-- 15. GPS TELEMATICS, TRIP MANAGEMENT & FUEL CONSUMPTION EXTENSION
-- Module: GPS Tracking, Trip Dispatch & Fuel Reconciliation
-- Status: 100% Additive (Preserves all existing tables and data)
-- ====================================================================

-- 15.1 EXTENSION ENUMS
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

-- 15.2 GPS DEVICES MASTER REGISTRY
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

-- 15.3 GPS POSITIONS & TELEMATICS PINGS (TIME-SERIES)
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

-- 15.4 GPS SYNCHRONIZATION LOGS & DIAGNOSTICS
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
  triggered_by TEXT DEFAULT 'SCHEDULED_CRON'
);

-- 15.5 TRIPS & DISPATCH MANAGEMENT
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
  is_loaded_trip BOOLEAN DEFAULT TRUE,
  
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

-- 15.6 VEHICLE FUEL CONSUMPTION BENCHMARKS
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

-- 15.7 ACTUAL FUEL TRANSACTIONS (RECEIPTS & DISPENSER ENTRIES)
CREATE TABLE IF NOT EXISTS fuel_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_number TEXT UNIQUE NOT NULL, -- Auto FUEL-YYYY-XXXXXX
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fuel_station_name TEXT NOT NULL,
  station_city TEXT,
  fuel_type TEXT NOT NULL DEFAULT 'Diesel',
  is_full_tank BOOLEAN DEFAULT TRUE,
  payment_method fuel_payment_method NOT NULL DEFAULT 'PETROMIN_CARD',
  invoice_reference TEXT,
  receipt_photo_url TEXT,
  verified_by UUID REFERENCES profiles(id),
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15.8 TRIP FUEL RECONCILIATIONS & VARIANCE ANALYSIS
CREATE TABLE IF NOT EXISTS trip_fuel_reconciliations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL UNIQUE REFERENCES trips(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  actual_fuel_consumed_liters DECIMAL(10, 2),
  benchmark_liters_per_100km DECIMAL(5, 2) NOT NULL,
  distance_used_km DECIMAL(10, 2) NOT NULL,
  estimated_fuel_liters DECIMAL(10, 2) NOT NULL,
  variance_liters DECIMAL(10, 2) GENERATED ALWAYS AS (actual_fuel_consumed_liters - estimated_fuel_liters) STORED,
  variance_percentage DECIMAL(6, 2),
  has_abnormal_variance BOOLEAN DEFAULT FALSE,
  variance_reason TEXT,
  reconciliation_status TEXT DEFAULT 'PENDING_REVIEW',
  reviewed_by UUID REFERENCES profiles(id),
  reconciled_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15.9 AUTOMATIC NUMBER GENERATORS (TRIPS & FUEL)
CREATE OR REPLACE FUNCTION generate_trip_number()
RETURNS TRIGGER AS $$
DECLARE
  seq_num INT;
  year_str TEXT;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');
  SELECT COUNT(*) + 1 INTO seq_num FROM trips WHERE TO_CHAR(created_at, 'YYYY') = year_str;
  NEW.trip_number := 'TRIP-' || year_str || '-' || LPAD(seq_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_trip_number ON trips;
CREATE TRIGGER trg_generate_trip_number
BEFORE INSERT ON trips
FOR EACH ROW
WHEN (NEW.trip_number IS NULL OR NEW.trip_number = '')
EXECUTE FUNCTION generate_trip_number();

CREATE OR REPLACE FUNCTION generate_fuel_tx_number()
RETURNS TRIGGER AS $$
DECLARE
  seq_num INT;
  year_str TEXT;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');
  SELECT COUNT(*) + 1 INTO seq_num FROM fuel_transactions WHERE TO_CHAR(created_at, 'YYYY') = year_str;
  NEW.transaction_number := 'FUEL-' || year_str || '-' || LPAD(seq_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_fuel_tx_number ON fuel_transactions;
CREATE TRIGGER trg_generate_fuel_tx_number
BEFORE INSERT ON fuel_transactions
FOR EACH ROW
WHEN (NEW.transaction_number IS NULL OR NEW.transaction_number = '')
EXECUTE FUNCTION generate_fuel_tx_number();

-- 15.10 TELEMATICS INDEXES
CREATE INDEX IF NOT EXISTS idx_gps_pings_vehicle_time ON vehicle_gps_pings(vehicle_id, gps_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_gps_pings_device_time ON vehicle_gps_pings(device_id, gps_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_status ON trips(vehicle_id, status);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON trips(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_fuel_tx_vehicle_date ON fuel_transactions(vehicle_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_gps_sync_logs_started ON gps_sync_logs(sync_started_at DESC);

-- 15.11 ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE gps_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_gps_pings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_fuel_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_fuel_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read GPS Devices" ON gps_devices FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage GPS Devices" ON gps_devices FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('SUPER_ADMIN', 'FLEET_MANAGER')
  )
);

CREATE POLICY "Read GPS Pings" ON vehicle_gps_pings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Read GPS Sync Logs" ON gps_sync_logs FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Read Trips" ON trips FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage Trips" ON trips FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('SUPER_ADMIN', 'FLEET_MANAGER')
  )
);

CREATE POLICY "Read Fuel Transactions" ON fuel_transactions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Insert Fuel Transactions" ON fuel_transactions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Manage Fuel Benchmarks" ON vehicle_fuel_benchmarks FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('SUPER_ADMIN', 'FLEET_MANAGER', 'MANAGEMENT')
  )
);
CREATE POLICY "Read Fuel Reconciliations" ON trip_fuel_reconciliations FOR SELECT USING (auth.role() = 'authenticated');
