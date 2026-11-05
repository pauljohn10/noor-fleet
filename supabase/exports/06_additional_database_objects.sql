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
  CREATE POLICY "Public Upload Driver Issue Photos"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'driver-issue-photos');

  DROP POLICY IF EXISTS "Public Read Driver Issue Photos" ON storage.objects;
  CREATE POLICY "Public Read Driver Issue Photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'driver-issue-photos');

  -- Bucket: document-attachments
  DROP POLICY IF EXISTS "Staff Manage Document Attachments" ON storage.objects;
  CREATE POLICY "Staff Manage Document Attachments"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'document-attachments')
  WITH CHECK (bucket_id = 'document-attachments');

  DROP POLICY IF EXISTS "Public Read Document Attachments" ON storage.objects;
  CREATE POLICY "Public Read Document Attachments"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'document-attachments');

  -- Bucket: work-order-photos
  DROP POLICY IF EXISTS "Staff Manage Work Order Photos" ON storage.objects;
  CREATE POLICY "Staff Manage Work Order Photos"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'work-order-photos')
  WITH CHECK (bucket_id = 'work-order-photos');

  DROP POLICY IF EXISTS "Public Read Work Order Photos" ON storage.objects;
  CREATE POLICY "Public Read Work Order Photos"
  ON storage.objects FOR SELECT
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

