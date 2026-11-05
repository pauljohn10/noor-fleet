,,-- ====================================================================
-- FLEET & WORKSHOP MANAGEMENT SYSTEM - SEED DATA
-- Al-Noor United Transport Est. - Fuel Transportation Division
-- ====================================================================

-- 1. Profiles / User Accounts
INSERT INTO profiles (id, email, full_name, phone, role, department) VALUES
('p1111111-1111-1111-1111-111111111111', 'admin@alnoortransport.com', 'Rashid Al-Mansoor', '+966 50 123 4567', 'SUPER_ADMIN', 'Executive Management'),
('p2222222-2222-2222-2222-222222222222', 'fleet.manager@alnoortransport.com', 'Tariq Al-Ghamdi', '+966 55 987 6543', 'FLEET_MANAGER', 'Fleet Operations'),
('p3333333-3333-3333-3333-333333333333', 'supervisor@alnoortransport.com', 'Mahmoud Hassan', '+966 54 222 3333', 'WORKSHOP_SUPERVISOR', 'Workshop Maintenance'),
('p4444444-4444-4444-4444-444444444444', 'mechanic1@alnoortransport.com', 'Suresh Kumar', '+966 56 444 5555', 'MECHANIC', 'Workshop Maintenance'),
('p5555555-5555-5555-5555-555555555555', 'storekeeper@alnoortransport.com', 'Ibrahim Al-Zahrani', '+966 50 777 8888', 'STOREKEEPER', 'Parts & Inventory'),
('p6666666-6666-6666-6666-666666666666', 'driver1@alnoortransport.com', 'Mohammed Ali Khan', '+966 53 111 9999', 'DRIVER', 'Fuel Logistics'),
('p7777777-7777-7777-7777-777777777777', 'management@alnoortransport.com', 'Fahad Al-Subaie', '+966 50 888 2222', 'MANAGEMENT', 'Operations Audit');

-- 2. Workshop Locations & Suppliers
INSERT INTO workshop_locations (id, code, name, city, address, phone) VALUES
('w1111111-1111-1111-1111-111111111111', 'WS-DMM-01', 'Dammam Main Heavy Workshop', 'Dammam', 'King Fahd Road, Heavy Industrial Zone 2', '+966 13 888 1234'),
('w2222222-2222-2222-2222-222222222222', 'WS-RUH-01', 'Riyadh Logistics Workshop', 'Riyadh', 'Sulay Industrial Area', '+966 11 444 5678');

INSERT INTO suppliers (id, supplier_code, name, contact_person, phone, email, tax_number) VALUES
('s1111111-1111-1111-1111-111111111111', 'SUP-VOLVO-01', 'Zahid Tractor & Heavy Machinery (Volvo)', 'Khaled Al-Otaibi', '+966 12 687 0000', 'info@zahid.com', '300123456700003'),
('s2222222-2222-2222-2222-222222222222', 'SUP-MAN-01', 'Haji Husein Alireza & Co. (MAN Trucks)', 'Youssef Nader', '+966 12 604 2222', 'fleet@hha.com.sa', '300987654300003'),
('s3333333-3333-3333-3333-333333333333', 'SUP-TANK-01', 'Arabian Tankers & Trailer Factory', 'Ahmad Saleh', '+966 13 812 3456', 'sales@arabiantankers.com', '300555444300003');

-- 3. Drivers & Technicians
INSERT INTO drivers (id, profile_id, employee_id, full_name, license_number, license_type, license_expiry, phone, status) VALUES
('d1111111-1111-1111-1111-111111111111', 'p6666666-6666-6666-6666-666666666666', 'DRV-101', 'Mohammed Ali Khan', 'SA-9821441', 'Heavy Combination (Fuel Tanker)', '2027-11-15', '+966 53 111 9999', 'ACTIVE'),
('d2222222-2222-2222-2222-222222222222', NULL, 'DRV-102', 'Salem Abdulrahman', 'SA-8871239', 'Heavy Combination (Fuel Tanker)', '2026-10-01', '+966 55 333 4444', 'ACTIVE'),
('d3333333-3333-3333-3333-333333333333', NULL, 'DRV-103', 'Yassim Al-Harbi', 'SA-7761234', 'Heavy Vehicle', '2026-04-12', '+966 54 888 1111', 'ACTIVE');

INSERT INTO technicians (id, profile_id, employee_id, full_name, specialization, department, phone, hourly_rate) VALUES
('t1111111-1111-1111-1111-111111111111', 'p4444444-4444-4444-4444-444444444444', 'TECH-501', 'Suresh Kumar', 'Diesel Engine & Turbo Systems', 'Engine Overhaul', '+966 56 444 5555', 55.00),
('t2222222-2222-2222-2222-222222222222', NULL, 'TECH-502', 'Ahmed Al-Shehri', 'Pneumatic Brakes & ABS', 'Brakes & Suspension', '+966 50 999 1122', 50.00),
('t3333333-3333-3333-3333-333333333333', NULL, 'TECH-503', 'Bilal Hussain', 'Fuel Tanker Vapor Valves & Pumps', 'Tanker Systems', '+966 55 222 7788', 60.00);

-- 4. Vehicles (Tractor Heads) & Trailers
INSERT INTO vehicles (id, vehicle_id, plate_number, fleet_number, vehicle_type, make, model, year, vin, engine_number, current_mileage, current_engine_hours, assigned_driver_id, status, station_location) VALUES
('v1111111-1111-1111-1111-111111111111', 'TRK-0101', 'LBR-4921', 'FLT-101', 'TRACTOR_HEAD', 'Volvo', 'FH 500 Globetrotter (6x4)', 2023, 'YV2RT40G8PB123987', 'D13K500-88123', 142500, 3850, 'd1111111-1111-1111-1111-111111111111', 'AVAILABLE', 'Dammam Terminal'),
('v2222222-2222-2222-2222-222222222222', 'TRK-0102', 'BND-8192', 'FLT-102', 'TRACTOR_HEAD', 'MAN', 'TGX 33.540 (6x4)', 2022, 'WMA06XZZ4MP765432', 'D2676LF-99210', 198000, 5100, 'd2222222-2222-2222-2222-222222222222', 'ON_TRIP', 'Riyadh Express Route'),
('v3333333-3333-3333-3333-333333333333', 'TRK-0103', 'KSA-1103', 'FLT-103', 'TRACTOR_HEAD', 'Mercedes-Benz', 'Actros 3345 S', 2021, 'WDB9634031L543210', 'OM471-102938', 265000, 7200, 'd3333333-3333-3333-3333-333333333333', 'IN_WORKSHOP', 'Dammam Main Workshop'),
('v4444444-4444-4444-4444-444444444444', 'TRK-0104', 'DMM-9044', 'FLT-104', 'TRACTOR_HEAD', 'Volvo', 'FM 440 (6x4)', 2020, 'YV2RT40G1LB998877', 'D13K440-77612', 312000, 8900, NULL, 'OUT_OF_SERVICE', 'Jubail Depot');

INSERT INTO trailers (id, trailer_id, trailer_number, plate_number, tank_capacity_liters, number_of_compartments, manufacturer, model, year, vin, assigned_tractor_id, status, current_location) VALUES
('tr111111-1111-1111-1111-111111111111', 'TRL-201', 'T-201', 'TRA-3310', 36000, 4, 'Al-Mutlaq Tankers', '36K-ALU-4C', 2023, 'MAT938000PB551122', 'v1111111-1111-1111-1111-111111111111', 'ASSIGNED', 'Dammam Terminal'),
('tr222222-2222-2222-2222-222222222222', 'TRL-202', 'T-202', 'TRA-4488', 38000, 5, 'Gorica Tankers', '38K-STEEL-5C', 2022, 'GOR889100MP112233', 'v2222222-2222-2222-2222-222222222222', 'ASSIGNED', 'Riyadh Express Route'),
('tr333333-3333-3333-3333-333333333333', 'TRL-203', 'T-203', 'TRA-9901', 36000, 4, 'Al-Mutlaq Tankers', '36K-ALU-4C', 2021, 'MAT938000LB443322', 'v3333333-3333-3333-3333-333333333333', 'IN_WORKSHOP', 'Dammam Main Workshop');

UPDATE vehicles SET assigned_trailer_id = 'tr111111-1111-1111-1111-111111111111' WHERE id = 'v1111111-1111-1111-1111-111111111111';
UPDATE vehicles SET assigned_trailer_id = 'tr222222-2222-2222-2222-222222222222' WHERE id = 'v2222222-2222-2222-2222-222222222222';
UPDATE vehicles SET assigned_trailer_id = 'tr333333-3333-3333-3333-333333333333' WHERE id = 'v3333333-3333-3333-3333-333333333333';

-- 5. Part Categories & Spare Parts Inventory
INSERT INTO part_categories (id, name, description) VALUES
('c1111111-1111-1111-1111-111111111111', 'Engine & Filters', 'Oil, air, fuel, water separator filters and engine oils'),
('c2222222-2222-2222-2222-222222222222', 'Brakes & Pneumatics', 'Brake pads, drums, air valves, ABS sensors, brake chambers'),
('c3333333-3333-3333-3333-333333333333', 'Tanker Valves & Discharge', 'Vapor recovery valves, bottom loading API adaptors, emergency foot valves'),
('c4444444-4444-4444-4444-444444444444', 'Tires & Wheels', '315/80 R22.5 steer, drive, and trailer tires'),
('c5555555-5555-5555-5555-555555555555', 'Safety & Grounding', 'Static grounding reels, fire extinguishers, spill kits');

INSERT INTO parts (id, part_number, part_name, category_id, manufacturer, unit, minimum_stock, maximum_stock, current_stock, location_rack, unit_cost) VALUES
('pt111111-1111-1111-1111-111111111111', 'FIL-VOL-1512', 'Volvo D13 Heavy Engine Oil Filter Set', 'c1111111-1111-1111-1111-111111111111', 'Volvo OEM', 'SET', 10, 50, 24, 'Rack A-01', 280.00),
('pt222222-2222-2222-2222-222222222222', 'BRK-MAN-9022', 'MAN TGX Front Heavy Duty Brake Pad Kit', 'c2222222-2222-2222-2222-222222222222', 'Knorr-Bremse', 'SET', 8, 30, 4, 'Rack B-05', 650.00), -- Low stock alert!
('pt333333-3333-3333-3333-333333333333', 'TNK-API-400', '4-Inch API Bottom Loading Discharge Valve', 'c3333333-3333-3333-3333-333333333333', 'Civacon', 'PCS', 4, 15, 6, 'Rack C-10', 1450.00),
('pt444444-4444-4444-4444-444444444444', 'TIR-MIC-315', 'Michelin X Multiway 315/80 R22.5 Heavy Duty Tire', 'c4444444-4444-4444-4444-444444444444', 'Michelin', 'PCS', 12, 40, 18, 'Tire Rack 02', 1850.00),
('pt555555-5555-5555-5555-555555555555', 'SAF-GRD-50FT', 'ATEX Grounding Reel 15M Cable with Clamp', 'c5555555-5555-5555-5555-555555555555', 'Newson Gale', 'PCS', 3, 10, 2, 'Rack D-02', 890.00); -- Low stock alert!

-- 6. Preventive Maintenance Templates & Schedules
INSERT INTO maintenance_templates (id, template_code, title, description, vehicle_type, frequency_type, interval_value) VALUES
('mt111111-1111-1111-1111-111111111111', 'PM-ENG-10K', '10,000 KM Engine Oil & Filter Service', 'Change engine oil (15W-40), replace oil & fuel filters, inspect belts', 'TRACTOR_HEAD', 'MILEAGE', 10000),
('mt222222-2222-2222-2222-222222222222', 'PM-TNK-90D', '90-Day Fuel Tanker Valve & Emergency Inspection', 'Inspect vapor recovery, API bottom valves, emergency shut-off system, hydrostatic seal test', 'TANKER_TRAILER', 'DAYS', 90);

INSERT INTO maintenance_schedules (id, template_id, vehicle_id, trailer_id, title, frequency_type, interval_value, last_service_mileage, last_service_date, next_due_mileage, next_due_date, status) VALUES
('ms111111-1111-1111-1111-111111111111', 'mt111111-1111-1111-1111-111111111111', 'v1111111-1111-1111-1111-111111111111', NULL, '10,000 KM Engine Oil Service - TRK-0101', 'MILEAGE', 10000, 135000, '2026-07-10', 145000, '2026-09-30', 'DUE_SOON'),
('ms222222-2222-2222-2222-222222222222', 'mt222222-2222-2222-2222-222222222222', NULL, 'tr333333-3333-3333-3333-333333333333', '90-Day Tanker Safety & Discharge Inspection - TRL-203', 'DAYS', 90, 0, '2026-05-15', 0, '2026-08-15', 'OVERDUE');

-- 7. Work Orders / Job Cards
INSERT INTO work_orders (id, work_order_number, vehicle_id, trailer_id, driver_id, reported_by, problem_description, priority, workshop_location_id, assigned_supervisor_id, assigned_technician_id, estimated_completion, status, diagnosis_notes, parts_cost, labor_cost, external_service_cost, other_cost) VALUES
('wo111111-1111-1111-1111-111111111111', 'WO-2026-000001', 'v3333333-3333-3333-3333-333333333333', 'tr333333-3333-3333-3333-333333333333', 'd3333333-3333-3333-3333-333333333333', 'p3333333-3333-3333-3333-333333333333', 'Engine air pressure low warning & Compartment 2 API valve minor fuel weep during discharge.', 'HIGH', 'w1111111-1111-1111-1111-111111111111', 'p3333333-3333-3333-3333-333333333333', 't1111111-1111-1111-1111-111111111111', '2026-09-14 16:00:00+03', 'IN_PROGRESS', 'Air compressor gasket leak confirmed. Tanker Compartment 2 API seal requires replacement before next fuel loading.', 1450.00, 330.00, 0.00, 0.00),
('wo222222-2222-2222-2222-222222222222', 'WO-2026-000002', 'v1111111-1111-1111-1111-111111111111', 'tr111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'p6666666-6666-6666-6666-666666666666', 'Scheduled 140,000 KM Engine Maintenance & Steering alignment check.', 'MEDIUM', 'w1111111-1111-1111-1111-111111111111', 'p3333333-3333-3333-3333-333333333333', 't2222222-2222-2222-2222-222222222222', '2026-09-12 18:00:00+03', 'COMPLETED', 'Routine oil filter replacement and wheel balancing performed cleanly.', 280.00, 150.00, 200.00, 0.00);

-- Work Order Parts
INSERT INTO work_order_parts (id, work_order_id, part_id, quantity, unit_cost, issued_by) VALUES
('wop11111-1111-1111-1111-111111111111', 'wo111111-1111-1111-1111-111111111111', 'pt333333-3333-3333-3333-333333333333', 1, 1450.00, 'p5555555-5555-5555-5555-555555555555'),
('wop22222-2222-2222-2222-222222222222', 'wo222222-2222-2222-2222-222222222222', 'pt111111-1111-1111-1111-111111111111', 1, 280.00, 'p5555555-5555-5555-5555-555555555555');

-- Work Order Labor
INSERT INTO work_order_labor (id, work_order_id, technician_id, hours_worked, hourly_rate, work_description) VALUES
('wol11111-1111-1111-1111-111111111111', 'wo111111-1111-1111-1111-111111111111', 't1111111-1111-1111-1111-111111111111', 6.0, 55.00, 'Dismantled air compressor lines and replaced API seal on tanker compartment'),
('wol22222-2222-2222-2222-222222222222', 'wo222222-2222-2222-2222-222222222222', 't2222222-2222-2222-2222-222222222222', 3.0, 50.00, 'Engine oil drain, filter replacement, torque check');

-- 8. Vehicle Documents & Expiries
INSERT INTO vehicle_documents (id, document_type, vehicle_id, trailer_id, document_number, issue_date, expiry_date, issuing_authority) VALUES
('vd111111-1111-1111-1111-111111111111', 'Registration (Istimara)', 'v1111111-1111-1111-1111-111111111111', NULL, 'IST-901829', '2023-11-01', '2026-11-01', 'Saudi General Directorate of Traffic'),
('vd222222-2222-2222-2222-222222222222', 'Tanker Safety & Hydrostatic Certificate', NULL, 'tr111111-1111-1111-1111-111111111111', 'HYDRO-9921', '2025-09-20', '2026-09-20', 'Civil Defense Transport Authority'), -- 8 Days Expiring Soon!
('vd333333-3333-3333-3333-333333333333', 'Comprehensive Fleet Insurance Policy', 'v3333333-3333-3333-3333-333333333333', NULL, 'INS-Tawuniya-441', '2025-08-01', '2026-08-01', 'Tawuniya Cooperative Insurance'); -- Expired!

-- 9. Initial Notifications
INSERT INTO notifications (id, target_role, title, message, category, is_read) VALUES
('n1111111-1111-1111-1111-111111111111', 'WORKSHOP_SUPERVISOR', 'High Priority Work Order WO-2026-000001 Assigned', 'TRK-0103 air pressure & compartment leak requires immediate supervision.', 'WORK_ORDER', false),
('n2222222-2222-2222-2222-222222222222', 'FLEET_MANAGER', 'Tanker Hydrostatic Certificate Expiring in 8 Days', 'Trailer TRL-201 certificate expires on 2026-09-20.', 'DOCUMENT', false),
('n3333333-3333-3333-3333-333333333333', 'STOREKEEPER', 'Low Stock Warning: MAN Front Brake Pad Kit', 'Current stock for BRK-MAN-9022 is 4 (Min stock: 8).', 'STOCK', false);

-- 10. Audit Logs
INSERT INTO audit_logs (id, user_name, user_role, action, module, record_id, old_values, new_values) VALUES
('a1111111-1111-1111-1111-111111111111', 'Mahmoud Hassan', 'WORKSHOP_SUPERVISOR', 'STATUS_CHANGE', 'WORK_ORDERS', 'WO-2026-000001', '{"status": "ASSIGNED"}', '{"status": "IN_PROGRESS"}');
