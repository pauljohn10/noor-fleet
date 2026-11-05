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

