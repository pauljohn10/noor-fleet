-- =====================================================================
-- NOOR FLEET & WORKSHOP MANAGEMENT SYSTEM
-- Migration: 20261117_enhance_six_role_rbac.sql
-- Purpose  : Enhance Role-Based Access Control (RBAC) to support 6 roles:
--              1. SUPER_ADMIN      (Full system & user management access)
--              2. FLEET_MANAGER    (Manages fleet modules + creates work orders)
--              3. WORKSHOP_MANAGER (Manages workshop & maintenance modules)
--              4. FLEET_STAFF      (Manages authorized fleet records)
--              5. WORKSHOP_STAFF   (Manages authorized workshop records)
--              6. VIEWER           (Strict Read-Only access across modules)
--            Enforces permissions via Supabase Row Level Security (RLS)
--            on database tables and storage attachments, prevents privilege
--            escalation, and records automatic database audit logs for
--            CREATE, UPDATE, and DELETE operations.
-- =====================================================================

-- 1. Safely extend the PostgreSQL `user_role` enum (if `profiles.role` uses it)
-- Note: ALTER TYPE ... ADD VALUE IF NOT EXISTS is safe and idempotent.
-- All downstream functions, triggers, and RLS policies compare `role::text`
-- so this migration executes cleanly inside a single run without PostgreSQL
-- 55P04 ("unsafe use of new value of enum type") or 22P02 errors.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'FLEET_MANAGER';
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'WORKSHOP_MANAGER';
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'FLEET_STAFF';
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'WORKSHOP_STAFF';
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'VIEWER';
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'MANAGEMENT';
  END IF;
END $$;

-- 2. Ensure `public.profiles` has all required user management & RBAC columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'Fleet Operations',
  ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- If there is a CHECK constraint on profiles.role (when role is TEXT), update it to allow all 6 roles + legacy aliases
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'profiles'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

-- 3. Security-Definer Helper Functions for RLS Enforcement
-- `get_current_user_role()` returns the normalized role string for `auth.uid()`.
-- - Returns 'DEACTIVATED' if the user account has `is_active = false` (blocking all RLS policies).
-- - Maps legacy 'MANAGEMENT' to 'VIEWER' for seamless backward compatibility.
-- - Maps legacy 'WORKSHOP_SUPERVISOR' to 'WORKSHOP_MANAGER' and 'MECHANIC' to 'WORKSHOP_STAFF'.
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
  v_is_active BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 'ANONYMOUS';
  END IF;

  SELECT role::text, COALESCE(is_active, true)
    INTO v_role, v_is_active
    FROM public.profiles
   WHERE id = auth.uid();

  IF NOT FOUND THEN
    RETURN 'VIEWER';
  END IF;

  IF v_is_active = false THEN
    RETURN 'DEACTIVATED';
  END IF;

  RETURN CASE UPPER(TRIM(COALESCE(v_role, 'VIEWER')))
    WHEN 'SUPER_ADMIN'         THEN 'SUPER_ADMIN'
    WHEN 'FLEET_MANAGER'       THEN 'FLEET_MANAGER'
    WHEN 'WORKSHOP_MANAGER'    THEN 'WORKSHOP_MANAGER'
    WHEN 'WORKSHOP_SUPERVISOR' THEN 'WORKSHOP_MANAGER'
    WHEN 'FLEET_STAFF'         THEN 'FLEET_STAFF'
    WHEN 'OPERATIONS_STAFF'    THEN 'FLEET_STAFF'
    WHEN 'WORKSHOP_STAFF'      THEN 'WORKSHOP_STAFF'
    WHEN 'MECHANIC'            THEN 'WORKSHOP_STAFF'
    WHEN 'STOREKEEPER'         THEN 'WORKSHOP_STAFF'
    WHEN 'VIEWER'              THEN 'VIEWER'
    WHEN 'MANAGEMENT'          THEN 'VIEWER'
    ELSE 'VIEWER'
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_current_user_active()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Convenience role-group helpers for clean, readable RLS policies
CREATE OR REPLACE FUNCTION public.can_read_authenticated()
RETURNS BOOLEAN AS $$
  SELECT public.get_current_user_role() IN (
    'SUPER_ADMIN',
    'FLEET_MANAGER',
    'WORKSHOP_MANAGER',
    'FLEET_STAFF',
    'WORKSHOP_STAFF',
    'VIEWER'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.can_write_fleet()
RETURNS BOOLEAN AS $$
  SELECT public.get_current_user_role() IN (
    'SUPER_ADMIN',
    'FLEET_MANAGER',
    'FLEET_STAFF'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.can_delete_fleet()
RETURNS BOOLEAN AS $$
  SELECT public.get_current_user_role() IN (
    'SUPER_ADMIN',
    'FLEET_MANAGER'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.can_write_workshop()
RETURNS BOOLEAN AS $$
  SELECT public.get_current_user_role() IN (
    'SUPER_ADMIN',
    'WORKSHOP_MANAGER',
    'WORKSHOP_STAFF'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.can_delete_workshop()
RETURNS BOOLEAN AS $$
  SELECT public.get_current_user_role() IN (
    'SUPER_ADMIN',
    'WORKSHOP_MANAGER'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.can_write_inspections()
RETURNS BOOLEAN AS $$
  SELECT public.get_current_user_role() IN (
    'SUPER_ADMIN',
    'FLEET_MANAGER',
    'WORKSHOP_MANAGER',
    'FLEET_STAFF',
    'WORKSHOP_STAFF'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- 4. Prevent Privilege Escalation Trigger on `public.profiles`
-- Guarantees that:
--   a) Only `SUPER_ADMIN` (or backend service_role where `auth.uid() IS NULL`) can
--      assign or modify a user's `role` or `is_active` status.
--   b) Non-Super-Admin users cannot insert or update their own `role` to a higher permission.
--   c) A `SUPER_ADMIN` cannot accidentally deactivate or demote their own active account.
CREATE OR REPLACE FUNCTION public.fn_prevent_privilege_escalation()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_role TEXT;
BEGIN
  -- Allow backend service_role / postgres admin migrations where auth.uid() is null
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  v_actor_role := public.get_current_user_role();

  IF TG_OP = 'INSERT' THEN
    IF v_actor_role <> 'SUPER_ADMIN' THEN
      -- If a newly signed-up user row is created by self, force role to VIEWER unless already set by trigger
      IF NEW.id <> auth.uid() THEN
        RAISE EXCEPTION 'Access Denied: Only Super Admin can create user profiles.';
      END IF;
      IF NEW.role::text NOT IN ('VIEWER', 'MANAGEMENT') THEN
        RAISE EXCEPTION 'Security Violation: Users cannot assign themselves elevated roles.';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Block non-Super-Admins from changing `role` or `is_active`
    IF v_actor_role <> 'SUPER_ADMIN' THEN
      IF NEW.role::text IS DISTINCT FROM OLD.role::text THEN
        RAISE EXCEPTION 'Security Violation: You are not authorized to change user roles or permissions.';
      END IF;
      IF COALESCE(NEW.is_active, true) IS DISTINCT FROM COALESCE(OLD.is_active, true) THEN
        RAISE EXCEPTION 'Security Violation: Only Super Admin can activate or deactivate accounts.';
      END IF;
    ELSE
      -- Prevent Super Admin from demoting or deactivating their own account
      IF OLD.id = auth.uid() THEN
        IF NEW.role::text <> 'SUPER_ADMIN' THEN
          RAISE EXCEPTION 'Safety Lock: Super Admin cannot demote their own account.';
        END IF;
        IF COALESCE(NEW.is_active, true) = false THEN
          RAISE EXCEPTION 'Safety Lock: Super Admin cannot deactivate their own account.';
        END IF;
      END IF;
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_privilege_escalation
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_prevent_privilege_escalation();

-- 5. Update `handle_new_user()` Auth Trigger to Safely Normalize All 6 Roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  raw_role TEXT;
  safe_role TEXT;
BEGIN
  raw_role := UPPER(TRIM(COALESCE(NEW.raw_user_meta_data->>'role', 'VIEWER')));
  safe_role := CASE
    WHEN raw_role IN (
      'SUPER_ADMIN',
      'FLEET_MANAGER',
      'WORKSHOP_MANAGER',
      'FLEET_STAFF',
      'WORKSHOP_STAFF',
      'VIEWER',
      'MANAGEMENT'
    ) THEN raw_role
    ELSE 'VIEWER'
  END;

  INSERT INTO public.profiles (id, email, full_name, role, department, phone, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    safe_role::public.user_role,
    COALESCE(NEW.raw_user_meta_data->>'department', 'Fleet Operations'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE((NEW.raw_user_meta_data->>'is_active')::boolean, true)
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    full_name  = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback if `profiles.role` is TEXT rather than `public.user_role` enum
    INSERT INTO public.profiles (id, email, full_name, role, department, phone, is_active)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      safe_role,
      COALESCE(NEW.raw_user_meta_data->>'department', 'Fleet Operations'),
      COALESCE(NEW.raw_user_meta_data->>'phone', ''),
      COALESCE((NEW.raw_user_meta_data->>'is_active')::boolean, true)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Audit Logs Table & Automatic Database Audit Trigger
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name TEXT,
  user_role TEXT,
  action TEXT NOT NULL DEFAULT 'UPDATE',
  module TEXT NOT NULL DEFAULT 'SYSTEM',
  record_id TEXT DEFAULT '',
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist if `public.audit_logs` was created by an older migration
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_name TEXT,
  ADD COLUMN IF NOT EXISTS user_role TEXT,
  ADD COLUMN IF NOT EXISTS action TEXT DEFAULT 'UPDATE',
  ADD COLUMN IF NOT EXISTS module TEXT DEFAULT 'SYSTEM',
  ADD COLUMN IF NOT EXISTS record_id TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS old_values JSONB,
  ADD COLUMN IF NOT EXISTS new_values JSONB,
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs (module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);

-- Automatic Audit Trigger Function for CREATE, UPDATE, and DELETE across core tables
CREATE OR REPLACE FUNCTION public.fn_record_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_user_name TEXT;
  v_user_role TEXT;
  v_record_id TEXT;
  v_old_json JSONB := NULL;
  v_new_json JSONB := NULL;
  v_action TEXT;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NOT NULL THEN
    SELECT full_name, role::text
      INTO v_user_name, v_user_role
      FROM public.profiles
     WHERE id = v_user_id;
  END IF;

  v_user_name := COALESCE(v_user_name, 'System / Service API');
  v_user_role := COALESCE(v_user_role, 'SUPER_ADMIN');

  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATE';
    v_new_json := to_jsonb(NEW);
    v_record_id := COALESCE(v_new_json->>'id', v_new_json->>'plate_number', v_new_json->>'work_order_no', '');
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'UPDATE';
    v_old_json := to_jsonb(OLD);
    v_new_json := to_jsonb(NEW);
    -- Skip noisy no-op updates where only updated_at changed
    IF (v_old_json - 'updated_at') = (v_new_json - 'updated_at') THEN
      RETURN NEW;
    END IF;
    v_record_id := COALESCE(v_new_json->>'id', v_old_json->>'id', '');
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
    v_old_json := to_jsonb(OLD);
    v_record_id := COALESCE(v_old_json->>'id', v_old_json->>'plate_number', '');
  END IF;

  INSERT INTO public.audit_logs (
    user_id,
    user_name,
    user_role,
    action,
    module,
    record_id,
    old_values,
    new_values
  ) VALUES (
    v_user_id,
    v_user_name,
    v_user_role,
    v_action,
    TG_TABLE_NAME,
    v_record_id,
    v_old_json,
    v_new_json
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never block primary business transaction if audit log write fails
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach Audit Trigger to Core Tables
DO $$
DECLARE
  t TEXT;
  audited_tables TEXT[] := ARRAY[
    'profiles',
    'vehicles',
    'small_vehicles',
    'trailers',
    'tanker_test_records',
    'drivers',
    'vehicle_documents',
    'work_orders',
    'maintenance_schedules',
    'parts',
    'inventory_transactions',
    'trips',
    'fuel_transactions',
    'gps_devices'
  ];
BEGIN
  FOREACH t IN ARRAY audited_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', t, t);
      EXECUTE format(
        'CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_record_audit_log()',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- =====================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES ACROSS ALL TABLES
-- =====================================================================

-- Enable RLS on all tables that exist in `public`
DO $$
DECLARE
  t TEXT;
  all_tables TEXT[] := ARRAY[
    'profiles',
    'vehicles',
    'small_vehicles',
    'trailers',
    'trailer_compartments',
    'tanker_test_records',
    'drivers',
    'vehicle_documents',
    'defect_reports',
    'vehicle_inspections',
    'work_orders',
    'work_order_parts',
    'work_order_labor',
    'maintenance_schedules',
    'parts',
    'inventory_transactions',
    'technicians',
    'trips',
    'fuel_transactions',
    'vehicle_fuel_benchmarks',
    'gps_devices',
    'audit_logs'
  ];
BEGIN
  FOREACH t IN ARRAY all_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;

-- Drop existing policies cleanly before recreating 6-role policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles',
        'vehicles',
        'small_vehicles',
        'trailers',
        'trailer_compartments',
        'tanker_test_records',
        'drivers',
        'vehicle_documents',
        'defect_reports',
        'vehicle_inspections',
        'work_orders',
        'work_order_parts',
        'work_order_labor',
        'maintenance_schedules',
        'parts',
        'inventory_transactions',
        'technicians',
        'trips',
        'fuel_transactions',
        'vehicle_fuel_benchmarks',
        'gps_devices',
        'audit_logs'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 7A. PROFILES TABLE (User Accounts & Roles)
-- - Read: Active authenticated users can read profiles (or their own row).
-- - Insert: Super Admin only.
-- - Update: Super Admin can update any profile; active users can update
--           their own basic profile info (trigger blocks role/is_active changes).
-- - Delete: Super Admin only (cannot delete own profile).
-- ---------------------------------------------------------------------
CREATE POLICY "rbac_profiles_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.can_read_authenticated());

CREATE POLICY "rbac_profiles_insert"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.get_current_user_role() = 'SUPER_ADMIN' OR auth.uid() = id);

CREATE POLICY "rbac_profiles_update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    public.get_current_user_role() = 'SUPER_ADMIN'
    OR (auth.uid() = id AND public.is_current_user_active())
  )
  WITH CHECK (
    public.get_current_user_role() = 'SUPER_ADMIN'
    OR (auth.uid() = id AND public.is_current_user_active())
  );

CREATE POLICY "rbac_profiles_delete"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.get_current_user_role() = 'SUPER_ADMIN' AND auth.uid() <> id);

-- ---------------------------------------------------------------------
-- 7B. FLEET MASTER & OPERATIONS TABLES
-- (`vehicles`, `small_vehicles`, `trailers`, `trailer_compartments`,
--  `drivers`, `vehicle_documents`, `trips`, `fuel_transactions`,
--  `vehicle_fuel_benchmarks`, `gps_devices`)
-- - SELECT: All 6 active roles (plus `anon` read on vehicles/trailers/drivers for public QR defect reporting)
-- - INSERT / UPDATE: SUPER_ADMIN, FLEET_MANAGER, FLEET_STAFF (Viewer & Workshop roles blocked)
-- - DELETE: SUPER_ADMIN, FLEET_MANAGER (Fleet Staff & Viewer blocked from deleting master records)
-- ---------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
  fleet_tables TEXT[] := ARRAY[
    'vehicles',
    'small_vehicles',
    'trailers',
    'trailer_compartments',
    'drivers',
    'vehicle_documents',
    'trips',
    'fuel_transactions',
    'vehicle_fuel_benchmarks',
    'gps_devices'
  ];
BEGIN
  FOREACH t IN ARRAY fleet_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format(
        'CREATE POLICY "rbac_%I_select" ON public.%I FOR SELECT TO authenticated USING (public.can_read_authenticated())',
        t, t
      );
      EXECUTE format(
        'CREATE POLICY "rbac_%I_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_write_fleet())',
        t, t
      );
      EXECUTE format(
        'CREATE POLICY "rbac_%I_update" ON public.%I FOR UPDATE TO authenticated USING (public.can_write_fleet()) WITH CHECK (public.can_write_fleet())',
        t, t
      );
      EXECUTE format(
        'CREATE POLICY "rbac_%I_delete" ON public.%I FOR DELETE TO authenticated USING (public.can_delete_fleet())',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- Public QR Driver Defect Report lookup access (read-only on vehicles, small_vehicles, trailers, drivers)
DO $$
DECLARE
  t TEXT;
  qr_lookup_tables TEXT[] := ARRAY['vehicles', 'small_vehicles', 'trailers', 'drivers'];
BEGIN
  FOREACH t IN ARRAY qr_lookup_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format(
        'CREATE POLICY "rbac_%I_anon_qr_select" ON public.%I FOR SELECT TO anon USING (true)',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 7C. TANK TESTING & SHARED INSPECTION TABLES
-- (`tanker_test_records` -> Fleetwrite: SUPER_ADMIN, FLEET_MANAGER, FLEET_STAFF)
-- (`vehicle_inspections`, `defect_reports` -> Shared inspection write)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tanker_test_records'
  ) THEN
    CREATE POLICY "rbac_tanker_test_records_select"
      ON public.tanker_test_records FOR SELECT
      TO authenticated
      USING (public.can_read_authenticated());

    CREATE POLICY "rbac_tanker_test_records_insert"
      ON public.tanker_test_records FOR INSERT
      TO authenticated
      WITH CHECK (public.can_write_fleet());

    CREATE POLICY "rbac_tanker_test_records_update"
      ON public.tanker_test_records FOR UPDATE
      TO authenticated
      USING (public.can_write_fleet())
      WITH CHECK (public.can_write_fleet());

    CREATE POLICY "rbac_tanker_test_records_delete"
      ON public.tanker_test_records FOR DELETE
      TO authenticated
      USING (public.can_delete_fleet());
  END IF;
END $$;

DO $$
DECLARE
  t TEXT;
  inspection_tables TEXT[] := ARRAY[
    'vehicle_inspections'
  ];
BEGIN
  FOREACH t IN ARRAY inspection_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format(
        'CREATE POLICY "rbac_%I_select" ON public.%I FOR SELECT TO authenticated USING (public.can_read_authenticated())',
        t, t
      );
      EXECUTE format(
        'CREATE POLICY "rbac_%I_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_write_inspections())',
        t, t
      );
      EXECUTE format(
        'CREATE POLICY "rbac_%I_update" ON public.%I FOR UPDATE TO authenticated USING (public.can_write_inspections()) WITH CHECK (public.can_write_inspections())',
        t, t
      );
      EXECUTE format(
        'CREATE POLICY "rbac_%I_delete" ON public.%I FOR DELETE TO authenticated USING (public.get_current_user_role() IN (''SUPER_ADMIN'', ''FLEET_MANAGER'', ''WORKSHOP_MANAGER''))',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- Special handling for `defect_reports` (supports public QR driver submission + authenticated RBAC)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'defect_reports'
  ) THEN
    CREATE POLICY "rbac_defect_reports_select"
      ON public.defect_reports FOR SELECT
      TO anon, authenticated
      USING (true);

    CREATE POLICY "rbac_defect_reports_anon_insert"
      ON public.defect_reports FOR INSERT
      TO anon
      WITH CHECK (true);

    CREATE POLICY "rbac_defect_reports_auth_insert"
      ON public.defect_reports FOR INSERT
      TO authenticated
      WITH CHECK (public.can_write_inspections());

    CREATE POLICY "rbac_defect_reports_update"
      ON public.defect_reports FOR UPDATE
      TO authenticated
      USING (public.can_write_inspections())
      WITH CHECK (public.can_write_inspections());

    CREATE POLICY "rbac_defect_reports_delete"
      ON public.defect_reports FOR DELETE
      TO authenticated
      USING (public.get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER', 'WORKSHOP_MANAGER'));
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 7D. WORKSHOP & MAINTENANCE TABLES
-- (`work_orders`, `work_order_parts`, `work_order_labor`,
--  `maintenance_schedules`, `parts`, `inventory_transactions`, `technicians`)
-- - SELECT: All 6 active roles
-- - INSERT / UPDATE: SUPER_ADMIN, WORKSHOP_MANAGER, WORKSHOP_STAFF, FLEET_MANAGER
--   (VIEWER and FLEET_STAFF are read-only on workshop tables)
-- - DELETE: SUPER_ADMIN, WORKSHOP_MANAGER
-- ---------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
  workshop_tables TEXT[] := ARRAY[
    'work_orders',
    'work_order_parts',
    'work_order_labor',
    'maintenance_schedules',
    'parts',
    'inventory_transactions',
    'technicians'
  ];
BEGIN
  FOREACH t IN ARRAY workshop_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format(
        'CREATE POLICY "rbac_%I_select" ON public.%I FOR SELECT TO authenticated USING (public.can_read_authenticated())',
        t, t
      );
      EXECUTE format(
        'CREATE POLICY "rbac_%I_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_write_workshop())',
        t, t
      );
      EXECUTE format(
        'CREATE POLICY "rbac_%I_update" ON public.%I FOR UPDATE TO authenticated USING (public.can_write_workshop()) WITH CHECK (public.can_write_workshop())',
        t, t
      );
      EXECUTE format(
        'CREATE POLICY "rbac_%I_delete" ON public.%I FOR DELETE TO authenticated USING (public.can_delete_workshop())',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 7E. AUDIT LOGS TABLE
-- - SELECT: SUPER_ADMIN only
-- - INSERT: All active non-viewer users (and database security-definer triggers)
-- - UPDATE / DELETE: Restricted to SUPER_ADMIN only
-- ---------------------------------------------------------------------
CREATE POLICY "rbac_audit_logs_select"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.get_current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "rbac_audit_logs_insert"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.can_read_authenticated());

-- ---------------------------------------------------------------------
-- 8. SUPABASE STORAGE (`storage.objects`) ATTACHMENT PERMISSIONS
-- Enforces that Viewers (`VIEWER` / `MANAGEMENT`) can view/download files
-- in `document-attachments`, while only authorized operational roles can
-- upload (`INSERT`), replace (`UPDATE`), or delete (`DELETE`) files.
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('document-attachments', 'document-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Read Access for Document Attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow Authenticated Uploads to Document Attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow Authenticated Updates to Document Attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow Authenticated Deletes from Document Attachments" ON storage.objects;
DROP POLICY IF EXISTS "rbac_storage_document_attachments_select" ON storage.objects;
DROP POLICY IF EXISTS "rbac_storage_document_attachments_insert" ON storage.objects;
DROP POLICY IF EXISTS "rbac_storage_document_attachments_update" ON storage.objects;
DROP POLICY IF EXISTS "rbac_storage_document_attachments_delete" ON storage.objects;

-- Read/Download: Public & authenticated users can preview and download attachments
CREATE POLICY "rbac_storage_document_attachments_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'document-attachments');

-- Upload: Strictly blocked for VIEWER and deactivated accounts
CREATE POLICY "rbac_storage_document_attachments_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'document-attachments'
    AND public.can_write_inspections()
  );

-- Update/Replace: Strictly blocked for VIEWER and deactivated accounts
CREATE POLICY "rbac_storage_document_attachments_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'document-attachments'
    AND public.can_write_inspections()
  )
  WITH CHECK (
    bucket_id = 'document-attachments'
    AND public.can_write_inspections()
  );

-- Delete Attachment: Restricted to SUPER_ADMIN, FLEET_MANAGER, WORKSHOP_MANAGER
CREATE POLICY "rbac_storage_document_attachments_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'document-attachments'
    AND public.get_current_user_role() IN ('SUPER_ADMIN', 'FLEET_MANAGER', 'WORKSHOP_MANAGER')
  );
