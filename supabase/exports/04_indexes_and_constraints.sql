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

