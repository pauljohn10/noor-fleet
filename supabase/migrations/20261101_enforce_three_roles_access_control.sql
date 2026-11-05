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

