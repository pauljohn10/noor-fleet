-- ====================================================================
-- MIGRATION: Add SMALL_VEHICLE to vehicle_type enum
-- Date: 2026-11-14
-- Description:
--   1. Adds 'SMALL_VEHICLE' and 'OTHER' enum values to vehicle_type.
--   2. Updates all Small Vehicles (SV-1-100 to SV-1-133) to vehicle_type = 'SMALL_VEHICLE'.
-- ====================================================================

-- 1. Add SMALL_VEHICLE and OTHER to enum
ALTER TYPE vehicle_type ADD VALUE IF NOT EXISTS 'SMALL_VEHICLE';
ALTER TYPE vehicle_type ADD VALUE IF NOT EXISTS 'OTHER';

-- 2. Update all imported small vehicles
UPDATE vehicles
SET vehicle_type = 'SMALL_VEHICLE'
WHERE vehicle_id LIKE 'SV-%';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
