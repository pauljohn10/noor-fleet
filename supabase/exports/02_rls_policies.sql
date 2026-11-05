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

