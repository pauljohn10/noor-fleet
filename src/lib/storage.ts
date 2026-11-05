import { 
  Vehicle, Trailer, Driver, Technician, WorkshopLocation, Supplier,
  WorkOrder, WorkOrderPart, WorkOrderLabor, WorkOrderPhoto, Part, PartCategory,
  InventoryTransaction, MaintenanceTemplate, MaintenanceSchedule,
  VehicleInspection, VehicleDocument, NotificationItem, AuditLog, DefectReport,
  GpsDevice, VehicleGpsPing, GpsSyncLog, Trip, VehicleFuelBenchmark, FuelTransaction, TripFuelReconciliation
} from '../types';

const STORAGE_KEY_PREFIX = 'FWMS_V1_';

export class LocalStorageRepository {
  private static get<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(STORAGE_KEY_PREFIX + key);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private static set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  // Initial Seed Datasets matching seed.sql
  static initialVehicles: Vehicle[] = [
    {
      id: 'v1111111-1111-1111-1111-111111111111',
      vehicle_id: 'TRK-0101',
      plate_number: 'LBR-4921',
      fleet_number: 'FLT-101',
      vehicle_type: 'TRACTOR_HEAD',
      make: 'Volvo',
      model: 'FH 500 Globetrotter (6x4)',
      year: 2023,
      vin: 'YV2RT40G8PB123987',
      engine_number: 'D13K500-88123',
      color: 'White / Yellow Stripe',
      fuel_type: 'Diesel',
      current_mileage: 142500,
      current_engine_hours: 3850,
      assigned_driver_id: 'd1111111-1111-1111-1111-111111111111',
      assigned_trailer_id: 'tr111111-1111-1111-1111-111111111111',
      department: 'Fuel Transport Logistics',
      station_location: 'Dammam Terminal',
      status: 'AVAILABLE',
      purchase_date: '2023-01-15',
      purchase_cost: 480000,
      notes: 'Primary long-haul fuel tanker tractor head',
      created_at: '2023-01-15T00:00:00Z',
      updated_at: '2026-09-12T00:00:00Z'
    },
    {
      id: 'v2222222-2222-2222-2222-222222222222',
      vehicle_id: 'TRK-0102',
      plate_number: 'BND-8192',
      fleet_number: 'FLT-102',
      vehicle_type: 'TRACTOR_HEAD',
      make: 'MAN',
      model: 'TGX 33.540 (6x4)',
      year: 2022,
      vin: 'WMA06XZZ4MP765432',
      engine_number: 'D2676LF-99210',
      color: 'White / Yellow Stripe',
      fuel_type: 'Diesel',
      current_mileage: 198000,
      current_engine_hours: 5100,
      assigned_driver_id: 'd2222222-2222-2222-2222-222222222222',
      assigned_trailer_id: 'tr222222-2222-2222-2222-222222222222',
      department: 'Fuel Transport Logistics',
      station_location: 'Riyadh Express Route',
      status: 'ON_TRIP',
      purchase_date: '2022-04-10',
      purchase_cost: 450000,
      notes: 'Equipped with digital fleet telematics',
      created_at: '2022-04-10T00:00:00Z',
      updated_at: '2026-09-12T00:00:00Z'
    },
    {
      id: 'v3333333-3333-3333-3333-333333333333',
      vehicle_id: 'TRK-0103',
      plate_number: 'KSA-1103',
      fleet_number: 'FLT-103',
      vehicle_type: 'TRACTOR_HEAD',
      make: 'Mercedes-Benz',
      model: 'Actros 3345 S',
      year: 2021,
      vin: 'WDB9634031L543210',
      engine_number: 'OM471-102938',
      color: 'White',
      fuel_type: 'Diesel',
      current_mileage: 265000,
      current_engine_hours: 7200,
      assigned_driver_id: 'd3333333-3333-3333-3333-333333333333',
      assigned_trailer_id: 'tr333333-3333-3333-3333-333333333333',
      department: 'Fuel Transport Logistics',
      station_location: 'Dammam Main Workshop',
      status: 'IN_WORKSHOP',
      purchase_date: '2021-08-20',
      purchase_cost: 420000,
      notes: 'Currently undergoing air compressor overhaul in Workshop Bay 3',
      created_at: '2021-08-20T00:00:00Z',
      updated_at: '2026-09-12T00:00:00Z'
    },
    {
      id: 'v4444444-4444-4444-4444-444444444444',
      vehicle_id: 'TRK-0104',
      plate_number: 'DMM-9044',
      fleet_number: 'FLT-104',
      vehicle_type: 'TRACTOR_HEAD',
      make: 'Volvo',
      model: 'FM 440 (6x4)',
      year: 2020,
      vin: 'YV2RT40G1LB998877',
      engine_number: 'D13K440-77612',
      color: 'White',
      fuel_type: 'Diesel',
      current_mileage: 312000,
      current_engine_hours: 8900,
      department: 'Fleet Reserve',
      station_location: 'Jubail Depot',
      status: 'OUT_OF_SERVICE',
      purchase_date: '2020-03-05',
      purchase_cost: 390000,
      notes: 'Awaiting transmission replacement quote',
      created_at: '2020-03-05T00:00:00Z',
      updated_at: '2026-09-12T00:00:00Z'
    }
  ];

  static initialTrailers: Trailer[] = [
    {
      id: 'tr111111-1111-1111-1111-111111111111',
      trailer_id: 'TRL-201',
      trailer_number: 'T-201',
      plate_number: 'TRA-3310',
      tank_capacity_liters: 36000,
      number_of_compartments: 4,
      manufacturer: 'Al-Mutlaq Tankers',
      model: '36K-ALU-4C',
      year: 2023,
      vin: 'MAT938000PB551122',
      tank_type: 'Aluminum Alloy Fuel Tanker',
      assigned_tractor_id: 'v1111111-1111-1111-1111-111111111111',
      status: 'ASSIGNED',
      current_location: 'Dammam Terminal',
      notes: 'Top loading & API bottom discharge with vapor recovery system',
      created_at: '2023-02-01T00:00:00Z',
      updated_at: '2026-09-12T00:00:00Z'
    },
    {
      id: 'tr222222-2222-2222-2222-222222222222',
      trailer_id: 'TRL-202',
      trailer_number: 'T-202',
      plate_number: 'TRA-4488',
      tank_capacity_liters: 38000,
      number_of_compartments: 5,
      manufacturer: 'Gorica Tankers',
      model: '38K-STEEL-5C',
      year: 2022,
      vin: 'GOR889100MP112233',
      tank_type: 'Stainless Steel Chemical / Diesel Tanker',
      assigned_tractor_id: 'v2222222-2222-2222-2222-222222222222',
      status: 'ASSIGNED',
      current_location: 'Riyadh Express Route',
      notes: 'Equipped with pneumatic emergency foot valves',
      created_at: '2022-05-15T00:00:00Z',
      updated_at: '2026-09-12T00:00:00Z'
    },
    {
      id: 'tr333333-3333-3333-3333-333333333333',
      trailer_id: 'TRL-203',
      trailer_number: 'T-203',
      plate_number: 'TRA-9901',
      tank_capacity_liters: 36000,
      number_of_compartments: 4,
      manufacturer: 'Al-Mutlaq Tankers',
      model: '36K-ALU-4C',
      year: 2021,
      vin: 'MAT938000LB443322',
      tank_type: 'Aluminum Alloy Fuel Tanker',
      assigned_tractor_id: 'v3333333-3333-3333-3333-333333333333',
      status: 'IN_WORKSHOP',
      current_location: 'Dammam Main Workshop',
      notes: 'Vapor valve seal leakage under repair',
      created_at: '2021-09-10T00:00:00Z',
      updated_at: '2026-09-12T00:00:00Z'
    }
  ];

  static initialDrivers: Driver[] = [
    {
      id: 'd1111111-1111-1111-1111-111111111111',
      profile_id: 'p6666666-6666-6666-6666-666666666666',
      employee_id: 'DRV-101',
      full_name: 'Mohammed Ali Khan',
      license_number: 'SA-9821441',
      license_type: 'Heavy Combination (Hazardous Fuel Tanker)',
      license_expiry: '2027-11-15',
      phone: '+966 53 111 9999',
      status: 'ACTIVE',
      notes: 'Certified Aramco Fuel Terminal Hauler',
      created_at: '2022-01-10T00:00:00Z'
    },
    {
      id: 'd2222222-2222-2222-2222-222222222222',
      employee_id: 'DRV-102',
      full_name: 'Salem Abdulrahman',
      license_number: 'SA-8871239',
      license_type: 'Heavy Combination (Hazardous Fuel Tanker)',
      license_expiry: '2026-10-01',
      phone: '+966 55 333 4444',
      status: 'ACTIVE',
      notes: 'Dammam-Riyadh express driver',
      created_at: '2022-03-12T00:00:00Z'
    },
    {
      id: 'd3333333-3333-3333-3333-333333333333',
      employee_id: 'DRV-103',
      full_name: 'Yassim Al-Harbi',
      license_number: 'SA-7761234',
      license_type: 'Heavy Combination Vehicle',
      license_expiry: '2026-04-12',
      phone: '+966 54 888 1111',
      status: 'ACTIVE',
      created_at: '2023-05-01T00:00:00Z'
    }
  ];

  static initialTechnicians: Technician[] = [
    {
      id: 't1111111-1111-1111-1111-111111111111',
      profile_id: 'p4444444-4444-4444-4444-444444444444',
      employee_id: 'TECH-501',
      full_name: 'Suresh Kumar',
      specialization: 'Diesel Engine Overhaul & Turbo Systems',
      department: 'Engine Overhaul',
      phone: '+966 56 444 5555',
      hourly_rate: 55.00,
      status: 'ACTIVE',
      hire_date: '2021-03-01',
      created_at: '2021-03-01T00:00:00Z'
    },
    {
      id: 't2222222-2222-2222-2222-222222222222',
      employee_id: 'TECH-502',
      full_name: 'Ahmed Al-Shehri',
      specialization: 'Pneumatic Brakes, ABS & Suspension',
      department: 'Brakes & Chassis',
      phone: '+966 50 999 1122',
      hourly_rate: 50.00,
      status: 'ACTIVE',
      hire_date: '2022-06-15',
      created_at: '2022-06-15T00:00:00Z'
    },
    {
      id: 't3333333-3333-3333-3333-333333333333',
      employee_id: 'TECH-503',
      full_name: 'Bilal Hussain',
      specialization: 'Tanker API Valves, Pumps & Vapor Recovery',
      department: 'Tanker Specialized Systems',
      phone: '+966 55 222 7788',
      hourly_rate: 60.00,
      status: 'ACTIVE',
      hire_date: '2020-11-01',
      created_at: '2020-11-01T00:00:00Z'
    }
  ];

  static initialWorkOrders: WorkOrder[] = [
    {
      id: 'wo111111-1111-1111-1111-111111111111',
      work_order_number: 'WO-2026-000001',
      vehicle_id: 'v3333333-3333-3333-3333-333333333333',
      trailer_id: 'tr333333-3333-3333-3333-333333333333',
      driver_id: 'd3333333-3333-3333-3333-333333333333',
      reported_by: 'Mahmoud Hassan (Supervisor)',
      date_reported: '2026-09-10T09:30:00Z',
      problem_description: 'Engine air pressure low warning & Compartment 2 API valve minor fuel weep during discharge.',
      priority: 'HIGH',
      workshop_location_id: 'w1111111-1111-1111-1111-111111111111',
      assigned_supervisor_id: 'p3333333-3333-3333-3333-333333333333',
      assigned_technician_id: 't1111111-1111-1111-1111-111111111111',
      estimated_completion: '2026-09-14T16:00:00Z',
      status: 'IN_PROGRESS',
      diagnosis_notes: 'Air compressor gasket leak confirmed. Tanker Compartment 2 API seal requires replacement before next fuel loading.',
      repair_summary: 'Dismantled air compressor lines and replaced API discharge seal kit.',
      parts_cost: 1450.00,
      labor_cost: 330.00,
      external_service_cost: 0.00,
      other_cost: 0.00,
      total_cost: 1780.00,
      created_at: '2026-09-10T09:30:00Z',
      updated_at: '2026-09-12T10:00:00Z'
    },
    {
      id: 'wo222222-2222-2222-2222-222222222222',
      work_order_number: 'WO-2026-000002',
      vehicle_id: 'v1111111-1111-1111-1111-111111111111',
      trailer_id: 'tr111111-1111-1111-1111-111111111111',
      driver_id: 'd1111111-1111-1111-1111-111111111111',
      reported_by: 'Mohammed Ali Khan (Driver)',
      date_reported: '2026-09-05T08:00:00Z',
      problem_description: 'Scheduled 140,000 KM Engine Maintenance & Steering alignment check.',
      priority: 'MEDIUM',
      workshop_location_id: 'w1111111-1111-1111-1111-111111111111',
      assigned_supervisor_id: 'p3333333-3333-3333-3333-333333333333',
      assigned_technician_id: 't2222222-2222-2222-2222-222222222222',
      estimated_completion: '2026-09-06T18:00:00Z',
      actual_completion: '2026-09-06T17:30:00Z',
      status: 'RELEASED',
      diagnosis_notes: 'Standard 10,000 KM PM service cycle due.',
      repair_summary: 'Changed engine oil filter, air filter, and performed alignment calibration.',
      qc_passed: true,
      qc_notes: 'All torque checks verified against Volvo specs.',
      qc_date: '2026-09-06T17:00:00Z',
      parts_cost: 280.00,
      labor_cost: 150.00,
      external_service_cost: 200.00,
      other_cost: 0.00,
      total_cost: 630.00,
      created_at: '2026-09-05T08:00:00Z',
      updated_at: '2026-09-06T17:30:00Z'
    }
  ];

  static initialParts: Part[] = [
    {
      id: 'pt111111-1111-1111-1111-111111111111',
      part_number: 'FIL-VOL-1512',
      part_name: 'Volvo D13 Heavy Engine Oil Filter Set',
      category_id: 'Engine & Filters',
      manufacturer: 'Volvo OEM',
      unit: 'SET',
      minimum_stock: 10,
      maximum_stock: 50,
      current_stock: 24,
      location_rack: 'Rack A-01',
      unit_cost: 280.00,
      status: 'ACTIVE',
      created_at: '2023-01-01T00:00:00Z'
    },
    {
      id: 'pt222222-2222-2222-2222-222222222222',
      part_number: 'BRK-MAN-9022',
      part_name: 'MAN TGX Front Heavy Duty Brake Pad Kit',
      category_id: 'Brakes & Pneumatics',
      manufacturer: 'Knorr-Bremse',
      unit: 'SET',
      minimum_stock: 8,
      maximum_stock: 30,
      current_stock: 4, // LOW STOCK ALERT!
      location_rack: 'Rack B-05',
      unit_cost: 650.00,
      status: 'ACTIVE',
      created_at: '2023-01-01T00:00:00Z'
    },
    {
      id: 'pt333333-3333-3333-3333-333333333333',
      part_number: 'TNK-API-400',
      part_name: '4-Inch API Bottom Loading Discharge Valve',
      category_id: 'Tanker Valves',
      manufacturer: 'Civacon',
      unit: 'PCS',
      minimum_stock: 4,
      maximum_stock: 15,
      current_stock: 6,
      location_rack: 'Rack C-10',
      unit_cost: 1450.00,
      status: 'ACTIVE',
      created_at: '2023-01-01T00:00:00Z'
    },
    {
      id: 'pt444444-4444-4444-4444-444444444444',
      part_number: 'TIR-MIC-315',
      part_name: 'Michelin X Multiway 315/80 R22.5 Heavy Duty Tire',
      category_id: 'Tires & Wheels',
      manufacturer: 'Michelin',
      unit: 'PCS',
      minimum_stock: 12,
      maximum_stock: 40,
      current_stock: 18,
      location_rack: 'Tire Rack 02',
      unit_cost: 1850.00,
      status: 'ACTIVE',
      created_at: '2023-01-01T00:00:00Z'
    },
    {
      id: 'pt555555-5555-5555-5555-555555555555',
      part_number: 'SAF-GRD-50FT',
      part_name: 'ATEX Grounding Reel 15M Cable with Heavy Clamp',
      category_id: 'Safety Equipment',
      manufacturer: 'Newson Gale',
      unit: 'PCS',
      minimum_stock: 3,
      maximum_stock: 10,
      current_stock: 2, // LOW STOCK ALERT!
      location_rack: 'Rack D-02',
      unit_cost: 890.00,
      status: 'ACTIVE',
      created_at: '2023-01-01T00:00:00Z'
    }
  ];

  static initialSchedules: MaintenanceSchedule[] = [
    {
      id: 'ms111111-1111-1111-1111-111111111111',
      vehicle_id: 'v1111111-1111-1111-1111-111111111111',
      title: '10,000 KM Engine Oil Service - TRK-0101',
      frequency_type: 'MILEAGE',
      interval_value: 10000,
      last_service_mileage: 135000,
      last_service_date: '2026-07-10',
      next_due_mileage: 145000,
      next_due_date: '2026-09-30',
      status: 'DUE_SOON',
      notes: 'Current odometer 142,500 KM. Remaining: 2,500 KM.',
      created_at: '2026-07-10T00:00:00Z'
    },
    {
      id: 'ms222222-2222-2222-2222-222222222222',
      trailer_id: 'tr333333-3333-3333-3333-333333333333',
      title: '90-Day Tanker Hydrostatic & Discharge Valve Certification - TRL-203',
      frequency_type: 'DAYS',
      interval_value: 90,
      last_service_mileage: 0,
      last_service_date: '2026-05-15',
      next_due_mileage: 0,
      next_due_date: '2026-08-15',
      status: 'OVERDUE', // OVERDUE ALERT!
      notes: 'Critical mandatory Civil Defense safety certificate renewal',
      created_at: '2026-05-15T00:00:00Z'
    }
  ];

  static initialDocuments: VehicleDocument[] = [
    {
      id: 'vd111111-1111-1111-1111-111111111111',
      document_type: 'Vehicle Registration (Istimara)',
      vehicle_id: 'v1111111-1111-1111-1111-111111111111',
      document_number: 'IST-901829',
      issue_date: '2023-11-01',
      expiry_date: '2026-11-01',
      issuing_authority: 'Saudi General Directorate of Traffic',
      notes: 'Valid for all Saudi regional highways',
      created_at: '2023-11-01T00:00:00Z'
    },
    {
      id: 'vd222222-2222-2222-2222-222222222222',
      document_type: 'Tanker Hydrostatic & Vapor Test Certificate',
      trailer_id: 'tr111111-1111-1111-1111-111111111111',
      document_number: 'HYDRO-9921',
      issue_date: '2025-09-20',
      expiry_date: '2026-09-20', // EXPIRING SOON (8 DAYS)
      issuing_authority: 'Civil Defense Tanker Authority',
      notes: 'Required for entry to Saudi Aramco Loading Terminal',
      created_at: '2025-09-20T00:00:00Z'
    },
    {
      id: 'vd333333-3333-3333-3333-333333333333',
      document_type: 'Comprehensive Fleet Insurance Policy',
      vehicle_id: 'v3333333-3333-3333-3333-333333333333',
      document_number: 'INS-Tawuniya-441',
      issue_date: '2025-08-01',
      expiry_date: '2026-08-01', // EXPIRED!
      issuing_authority: 'Tawuniya Cooperative Insurance',
      notes: 'Insurance policy under renewal approval',
      created_at: '2025-08-01T00:00:00Z'
    }
  ];

  static initialNotifications: NotificationItem[] = [
    {
      id: 'n1111111-1111-1111-1111-111111111111',
      target_role: 'FLEET_MANAGER',
      title: 'High Priority Work Order WO-2026-000001 In Progress',
      message: 'TRK-0103 air pressure & compartment leak under repair in Workshop Bay 3.',
      category: 'WORK_ORDER',
      is_read: false,
      created_at: '2026-09-10T09:30:00Z'
    },
    {
      id: 'n2222222-2222-2222-2222-222222222222',
      target_role: 'FLEET_MANAGER',
      title: 'Tanker Hydrostatic Certificate Expiring in 8 Days',
      message: 'Trailer TRL-201 certificate (HYDRO-9921) expires on 2026-09-20.',
      category: 'DOCUMENT',
      is_read: false,
      created_at: '2026-09-12T08:00:00Z'
    },
    {
      id: 'n3333333-3333-3333-3333-333333333333',
      target_role: 'FLEET_MANAGER',
      title: 'Low Stock Alert: MAN Front Brake Pad Kit',
      message: 'Current stock for BRK-MAN-9022 is 4 units (Min threshold: 8).',
      category: 'STOCK',
      is_read: false,
      created_at: '2026-09-11T14:20:00Z'
    }
  ];

  static initialAuditLogs: AuditLog[] = [
    {
      id: 'a1111111-1111-1111-1111-111111111111',
      user_name: 'Mahmoud Hassan',
      user_role: 'WORKSHOP_SUPERVISOR',
      action: 'STATUS_CHANGE',
      module: 'WORK_ORDERS',
      record_id: 'WO-2026-000001',
      old_values: { status: 'ASSIGNED' },
      new_values: { status: 'IN_PROGRESS' },
      ip_address: '192.168.1.104',
      created_at: '2026-09-10T09:45:00Z'
    },
    {
      id: 'a2222222-2222-2222-2222-222222222222',
      user_name: 'Ibrahim Al-Zahrani',
      user_role: 'STOREKEEPER',
      action: 'ISSUE_PART',
      module: 'INVENTORY',
      record_id: 'TNK-API-400',
      old_values: { current_stock: 7 },
      new_values: { current_stock: 6, issued_to_wo: 'WO-2026-000001' },
      ip_address: '192.168.1.112',
      created_at: '2026-09-10T10:15:00Z'
    }
  ];

  // Repository Getters & Setters
  static getVehicles(): Vehicle[] {
    return this.get('vehicles', this.initialVehicles);
  }

  static saveVehicles(vehicles: Vehicle[]): void {
    this.set('vehicles', vehicles);
  }

  static getTrailers(): Trailer[] {
    return this.get('trailers', this.initialTrailers);
  }

  static saveTrailers(trailers: Trailer[]): void {
    this.set('trailers', trailers);
  }

  static getDrivers(): Driver[] {
    return this.get('drivers', this.initialDrivers);
  }

  static saveDrivers(drivers: Driver[]): void {
    this.set('drivers', drivers);
  }

  static getTechnicians(): Technician[] {
    return this.get('technicians', this.initialTechnicians);
  }

  static saveTechnicians(technicians: Technician[]): void {
    this.set('technicians', technicians);
  }

  static getWorkOrders(): WorkOrder[] {
    return this.get('workOrders', this.initialWorkOrders);
  }

  static saveWorkOrders(workOrders: WorkOrder[]): void {
    this.set('workOrders', workOrders);
  }

  static getParts(): Part[] {
    return this.get('parts', this.initialParts);
  }

  static saveParts(parts: Part[]): void {
    this.set('parts', parts);
  }

  static getSchedules(): MaintenanceSchedule[] {
    return this.get('schedules', this.initialSchedules);
  }

  static saveSchedules(schedules: MaintenanceSchedule[]): void {
    this.set('schedules', schedules);
  }

  static getInspections(): VehicleInspection[] {
    return this.get('inspections', []);
  }

  static saveInspections(inspections: VehicleInspection[]): void {
    this.set('inspections', inspections);
  }

  static getDocuments(): VehicleDocument[] {
    return this.get('documents', this.initialDocuments);
  }

  static saveDocuments(documents: VehicleDocument[]): void {
    this.set('documents', documents);
  }

  static updateDocument(id: string, updates: Partial<VehicleDocument>): VehicleDocument[] {
    const docs = this.getDocuments();
    const updated = docs.map(d => (d.id === id ? { ...d, ...updates } : d));
    this.saveDocuments(updated);
    return updated;
  }

  static deleteDocument(id: string): VehicleDocument[] {
    const docs = this.getDocuments();
    const updated = docs.filter(d => d.id !== id);
    this.saveDocuments(updated);
    return updated;
  }

  static getNotifications(): NotificationItem[] {
    return this.get('notifications', this.initialNotifications);
  }

  static saveNotifications(notifications: NotificationItem[]): void {
    this.set('notifications', notifications);
  }

  static initialDefectReports: DefectReport[] = [
    {
      id: 'def-001',
      report_number: 'DEF-2026-000125',
      driver_id: 'd1111111-1111-1111-1111-111111111111',
      driver_name: 'Mohammed Ali Khan',
      vehicle_id: 'v1111111-1111-1111-1111-111111111111',
      trailer_id: 'tr111111-1111-1111-1111-111111111111',
      category: 'Brakes',
      severity: 'HIGH',
      description: 'Pneumatic air pressure gauge slow to build up pressure after cold start.',
      status: 'UNDER_REVIEW',
      workshop_response: 'Inspection scheduled by Workshop Supervisor for Bay 2 check.',
      created_at: '2026-09-12T08:30:00Z'
    },
    {
      id: 'def-002',
      report_number: 'DEF-2026-000131',
      driver_id: 'd2222222-2222-2222-2222-222222222222',
      driver_name: 'Salem Abdulrahman',
      vehicle_id: 'v2222222-2222-2222-2222-222222222222',
      trailer_id: 'tr222222-2222-2222-2222-222222222222',
      category: 'Valve',
      severity: 'MEDIUM',
      description: 'Compartment 3 API bottom discharge valve handle sticky during discharge.',
      status: 'RESOLVED',
      workshop_response: 'Replaced Civacon valve seal ring kit in WO-2026-000002.',
      created_at: '2026-09-10T14:00:00Z'
    }
  ];

  static getDefectReports(): DefectReport[] {
    return this.get('defectReports', this.initialDefectReports);
  }

  static saveDefectReports(reports: DefectReport[]): void {
    this.set('defectReports', reports);
  }

  static addDefectReport(report: DefectReport): DefectReport[] {
    const list = this.getDefectReports();
    const updated = [report, ...list];
    this.saveDefectReports(updated);
    return updated;
  }

  static addNotification(notif: Omit<NotificationItem, 'id' | 'created_at' | 'is_read'>): void {
    const list = this.getNotifications();
    const newNotif: NotificationItem = {
      ...notif,
      id: 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      is_read: false,
      created_at: new Date().toISOString()
    };
    this.saveNotifications([newNotif, ...list]);
  }

  static getAuditLogs(): AuditLog[] {
    return this.get('auditLogs', this.initialAuditLogs);
  }

  static saveAuditLogs(logs: AuditLog[]): void {
    this.set('auditLogs', logs);
  }

  static addAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>): void {
    const logs = this.getAuditLogs();
    const newEntry: AuditLog = {
      ...log,
      id: 'aud-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      created_at: new Date().toISOString()
    };
    this.set('auditLogs', [newEntry, ...logs]);
  }

  // ====================================================================
  // GPS DEVICES, TELEMATICS PINGS, TRIPS & FUEL DATASETS
  // ====================================================================

  static initialGpsDevices: GpsDevice[] = [
    {
      id: 'dev-001',
      device_imei: 'IMEI-864019283746101',
      serial_number: 'SN-TK-9011',
      device_model: 'Teltonika FMB120 (Dual CAN & Fuel Sensor)',
      firmware_version: '03.28.02.Rev01',
      sim_phone_number: '+966509988111',
      sim_iccid: '8996603428250373481',
      installed_vehicle_id: 'v1111111-1111-1111-1111-111111111111',
      installation_date: '2023-01-20',
      installation_odometer: 100,
      is_active: true,
      battery_level_percent: 98,
      signal_strength_csq: 28,
      last_heartbeat: new Date().toISOString(),
      notes: 'Installed in Volvo FH500 Tractor Head TRK-0101',
      created_at: '2023-01-20T00:00:00Z'
    },
    {
      id: 'dev-002',
      device_imei: 'IMEI-864019283746102',
      serial_number: 'SN-TK-9012',
      device_model: 'Teltonika FMB120 (Dual CAN & Fuel Sensor)',
      firmware_version: '03.28.02.Rev01',
      sim_phone_number: '+966509988112',
      sim_iccid: '8996603428250373482',
      installed_vehicle_id: 'v2222222-2222-2222-2222-222222222222',
      installation_date: '2022-04-15',
      installation_odometer: 150,
      is_active: true,
      battery_level_percent: 94,
      signal_strength_csq: 26,
      last_heartbeat: new Date().toISOString(),
      notes: 'Installed in MAN TGX 33.540 Tractor Head TRK-0102',
      created_at: '2022-04-15T00:00:00Z'
    },
    {
      id: 'dev-003',
      device_imei: 'IMEI-864019283746103',
      serial_number: 'SN-TK-9013',
      device_model: 'CalAmp LMU-3030 OBD-II/CAN',
      firmware_version: 'v4.1.9',
      sim_phone_number: '+966509988113',
      sim_iccid: '8996603428250373483',
      installed_vehicle_id: 'v3333333-3333-3333-3333-333333333333',
      installation_date: '2021-06-10',
      installation_odometer: 200,
      is_active: true,
      battery_level_percent: 100,
      signal_strength_csq: 31,
      last_heartbeat: new Date().toISOString(),
      notes: 'Installed in Mercedes Actros TRK-0103',
      created_at: '2021-06-10T00:00:00Z'
    }
  ];

  // Real GPS pings start completely empty until an external provider is connected
  static initialGpsPings: VehicleGpsPing[] = [];

  static initialFuelBenchmarks: VehicleFuelBenchmark[] = [
    {
      id: 'bm-001',
      vehicle_type: 'TRACTOR_HEAD',
      make: 'Volvo',
      model: 'FH 500 Globetrotter (6x4)',
      empty_consumption_liters_per_100km: 34.0,
      loaded_consumption_liters_per_100km: 56.0,
      pto_pumping_consumption_liters_per_hour: 4.5,
      ac_summer_penalty_percentage: 8.0,
      effective_from: '2024-01-01',
      notes: 'Calibrated for 36,000L diesel tanker payload (~44 ton gross vehicle weight)',
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'bm-002',
      vehicle_type: 'TRACTOR_HEAD',
      make: 'MAN',
      model: 'TGX 33.540 (6x4)',
      empty_consumption_liters_per_100km: 35.0,
      loaded_consumption_liters_per_100km: 58.0,
      pto_pumping_consumption_liters_per_hour: 4.8,
      ac_summer_penalty_percentage: 8.5,
      effective_from: '2024-01-01',
      notes: 'Heavy duty heavy chassis calibrated baseline',
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'bm-003',
      vehicle_type: 'TRACTOR_HEAD',
      make: 'Mercedes-Benz',
      model: 'Actros 3345 S',
      empty_consumption_liters_per_100km: 33.0,
      loaded_consumption_liters_per_100km: 55.0,
      pto_pumping_consumption_liters_per_hour: 4.2,
      ac_summer_penalty_percentage: 8.0,
      effective_from: '2024-01-01',
      notes: 'OM471 Euro 5 engine benchmark',
      created_at: '2024-01-01T00:00:00Z'
    }
  ];

  static initialTrips: Trip[] = [
    {
      id: 'trip-001',
      trip_number: 'TRIP-2026-000101',
      vehicle_id: 'v1111111-1111-1111-1111-111111111111',
      assigned_driver_id: 'd1111111-1111-1111-1111-111111111111',
      assigned_trailer_id: 'tr111111-1111-1111-1111-111111111111',
      origin_name: 'Dammam Main Fuel Terminal Depot',
      origin_latitude: 26.4344,
      origin_longitude: 50.1033,
      destination_name: 'Riyadh North Bulk Distribution Hub',
      destination_latitude: 24.7136,
      destination_longitude: 46.6753,
      cargo_description: 'Diesel (Euro 5 Spec)',
      cargo_volume_liters: 36000,
      is_loaded_trip: true,
      planned_departure: new Date(Date.now() - 4 * 3600000).toISOString(),
      actual_departure: new Date(Date.now() - 3.8 * 3600000).toISOString(),
      planned_arrival: new Date(Date.now() + 1.5 * 3600000).toISOString(),
      start_odometer_km: 142180,
      gps_calculated_distance_km: 265.4,
      distance_calculation_method: 'GPS_HAVERSINE_SUMMATION',
      data_quality: 'HIGH_CONFIDENCE',
      status: 'IN_PROGRESS',
      notes: 'Standard express dispatch via Highway 40',
      dispatched_by: 'p2222222-2222-2222-2222-222222222222',
      created_at: new Date(Date.now() - 5 * 3600000).toISOString()
    },
    {
      id: 'trip-002',
      trip_number: 'TRIP-2026-000098',
      vehicle_id: 'v2222222-2222-2222-2222-222222222222',
      assigned_driver_id: 'd2222222-2222-2222-2222-222222222222',
      assigned_trailer_id: 'tr222222-2222-2222-2222-222222222222',
      origin_name: 'Ras Tanura Aramco Refinery Plant',
      origin_latitude: 26.6749,
      origin_longitude: 50.1557,
      destination_name: 'Dammam Port Bulk Storage Depot',
      destination_latitude: 26.4344,
      destination_longitude: 50.1033,
      cargo_description: 'Gasoline 95 Octane',
      cargo_volume_liters: 36000,
      is_loaded_trip: true,
      planned_departure: '2026-09-12T06:00:00Z',
      actual_departure: '2026-09-12T06:15:00Z',
      planned_arrival: '2026-09-12T08:30:00Z',
      actual_arrival: '2026-09-12T08:20:00Z',
      start_odometer_km: 198000,
      end_odometer_km: 198078,
      odometer_distance_km: 78,
      gps_calculated_distance_km: 77.2,
      final_distance_km: 77.5,
      distance_calculation_method: 'HYBRID_VERIFIED',
      data_quality: 'HIGH_CONFIDENCE',
      status: 'COMPLETED',
      notes: 'Completed without incidents. Discharge confirmed at Dammam Port.',
      dispatched_by: 'p2222222-2222-2222-2222-222222222222',
      created_at: '2026-09-12T05:30:00Z'
    },
    {
      id: 'trip-003',
      trip_number: 'TRIP-2026-000102',
      vehicle_id: 'v3333333-3333-3333-3333-333333333333',
      assigned_driver_id: 'd3333333-3333-3333-3333-333333333333',
      assigned_trailer_id: 'tr333333-3333-3333-3333-333333333333',
      origin_name: 'Dammam Fuel Terminal Depot',
      origin_latitude: 26.4344,
      origin_longitude: 50.1033,
      destination_name: 'Jubail Industrial Station #4',
      destination_latitude: 27.0046,
      destination_longitude: 49.6582,
      cargo_description: 'Diesel Fuel Delivery',
      cargo_volume_liters: 36000,
      is_loaded_trip: true,
      planned_departure: new Date(Date.now() + 12 * 3600000).toISOString(),
      planned_arrival: new Date(Date.now() + 15 * 3600000).toISOString(),
      start_odometer_km: 265000,
      gps_calculated_distance_km: 0,
      distance_calculation_method: 'GPS_HAVERSINE_SUMMATION',
      data_quality: 'HIGH_CONFIDENCE',
      status: 'PLANNED',
      notes: 'Scheduled for tomorrow morning loading rotation.',
      dispatched_by: 'p2222222-2222-2222-2222-222222222222',
      created_at: new Date().toISOString()
    }
  ];

  static initialFuelTransactions: FuelTransaction[] = [
    {
      id: 'fuel-001',
      transaction_number: 'FUEL-2026-000412',
      vehicle_id: 'v1111111-1111-1111-1111-111111111111',
      driver_id: 'd1111111-1111-1111-1111-111111111111',
      transaction_date: new Date(Date.now() - 4.5 * 3600000).toISOString(),
      fuel_station_name: 'Petromin Station #104 - Dammam Exit',
      station_city: 'Dammam',
      fuel_type: 'Diesel',
      liters_dispensed: 380.0,
      unit_cost: 1.15,
      total_cost: 437.0,
      odometer_at_fueling: 142180,
      is_full_tank: true,
      payment_method: 'PETROMIN_CARD',
      invoice_reference: 'INV-PET-98124',
      is_verified: true,
      created_at: new Date(Date.now() - 4.5 * 3600000).toISOString()
    },
    {
      id: 'fuel-002',
      transaction_number: 'FUEL-2026-000408',
      vehicle_id: 'v2222222-2222-2222-2222-222222222222',
      driver_id: 'd2222222-2222-2222-2222-222222222222',
      transaction_date: '2026-09-12T05:45:00Z',
      fuel_station_name: 'Aramco Bulk Terminal Internal Dispenser',
      station_city: 'Ras Tanura',
      fuel_type: 'Diesel',
      liters_dispensed: 44.5,
      unit_cost: 1.15,
      total_cost: 51.18,
      odometer_at_fueling: 198000,
      is_full_tank: true,
      payment_method: 'ARAMCO_BULK_DISPENSER',
      invoice_reference: 'ARM-DISP-0042',
      is_verified: true,
      created_at: '2026-09-12T05:50:00Z'
    }
  ];

  static initialTripReconciliations: TripFuelReconciliation[] = [
    {
      id: 'rec-001',
      trip_id: 'trip-002',
      vehicle_id: 'v2222222-2222-2222-2222-222222222222',
      actual_fuel_consumed_liters: 44.5,
      benchmark_liters_per_100km: 58.0,
      distance_used_km: 77.5,
      estimated_fuel_liters: 44.95,
      variance_liters: -0.45,
      variance_percentage: -1.0,
      has_abnormal_variance: false,
      variance_reason: 'Normal highway cruising speed with steady throttle.',
      reconciliation_status: 'APPROVED',
      reviewed_by: 'p2222222-2222-2222-2222-222222222222',
      reconciled_at: '2026-09-12T10:00:00Z'
    }
  ];

  static initialGpsSyncLogs: GpsSyncLog[] = [
    {
      id: 'log-001',
      sync_started_at: new Date().toISOString(),
      sync_completed_at: new Date().toISOString(),
      provider_name: 'NONE (UNCONFIGURED)',
      sync_status: 'SKIPPED',
      pings_received: 0,
      pings_inserted: 0,
      pings_skipped_duplicate: 0,
      pings_rejected_anomaly: 0,
      error_message: 'GPS provider API endpoint and credentials not configured. Awaiting real device integration.',
      api_latency_ms: 0,
      triggered_by: 'SYSTEM_STARTUP'
    }
  ];

  // Repository Methods for GPS, Trips & Fuel
  static getGpsDevices(): GpsDevice[] {
    return this.get('gpsDevices', this.initialGpsDevices);
  }

  static saveGpsDevices(devices: GpsDevice[]): void {
    this.set('gpsDevices', devices);
  }

  static addGpsDevice(device: Omit<GpsDevice, 'id' | 'created_at'>): GpsDevice {
    const list = this.getGpsDevices();
    const cleanImei = device.device_imei.trim();
    if (list.some(d => d.device_imei.trim().toLowerCase() === cleanImei.toLowerCase())) {
      throw new Error(`Device with IMEI "${cleanImei}" is already registered.`);
    }
    const newDevice: GpsDevice = {
      ...device,
      device_imei: cleanImei,
      id: 'dev-' + Date.now(),
      created_at: new Date().toISOString()
    };
    const updated = [newDevice, ...list];
    this.saveGpsDevices(updated);
    return newDevice;
  }

  static updateGpsDevice(id: string, updates: Partial<GpsDevice>): void {
    const list = this.getGpsDevices();
    if (updates.device_imei) {
      const cleanImei = updates.device_imei.trim();
      if (list.some(d => d.id !== id && d.device_imei.trim().toLowerCase() === cleanImei.toLowerCase())) {
        throw new Error(`Device with IMEI "${cleanImei}" is already registered.`);
      }
      updates.device_imei = cleanImei;
    }
    const updated = list.map(d => d.id === id ? { ...d, ...updates } : d);
    this.saveGpsDevices(updated);
  }

  static deleteGpsDevice(id: string): void {
    const list = this.getGpsDevices();
    const updated = list.filter(d => d.id !== id);
    this.saveGpsDevices(updated);
  }

  static getGpsPings(): VehicleGpsPing[] {
    return this.get('gpsPings', this.initialGpsPings);
  }

  static saveGpsPings(pings: VehicleGpsPing[]): void {
    this.set('gpsPings', pings);
  }

  static getTrips(): Trip[] {
    return this.get('trips', this.initialTrips);
  }

  static saveTrips(trips: Trip[]): void {
    this.set('trips', trips);
  }

  static addTrip(trip: Omit<Trip, 'id' | 'trip_number' | 'created_at'>): Trip {
    const list = this.getTrips();
    const seq = list.length + 101;
    const year = new Date().getFullYear();
    const newTrip: Trip = {
      ...trip,
      id: 'trip-' + Date.now(),
      trip_number: `TRIP-${year}-${String(seq).padStart(6, '0')}`,
      created_at: new Date().toISOString()
    };
    const updated = [newTrip, ...list];
    this.saveTrips(updated);
    return newTrip;
  }

  static updateTrip(id: string, updates: Partial<Trip>): void {
    const list = this.getTrips();
    const updated = list.map(t => t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t);
    this.saveTrips(updated);
  }

  static getFuelBenchmarks(): VehicleFuelBenchmark[] {
    return this.get('fuelBenchmarks', this.initialFuelBenchmarks);
  }

  static saveFuelBenchmarks(benchmarks: VehicleFuelBenchmark[]): void {
    this.set('fuelBenchmarks', benchmarks);
  }

  static getFuelTransactions(): FuelTransaction[] {
    return this.get('fuelTransactions', this.initialFuelTransactions);
  }

  static saveFuelTransactions(transactions: FuelTransaction[]): void {
    this.set('fuelTransactions', transactions);
  }

  static addFuelTransaction(tx: Omit<FuelTransaction, 'id' | 'transaction_number' | 'created_at'>): FuelTransaction {
    const list = this.getFuelTransactions();
    const seq = list.length + 413;
    const year = new Date().getFullYear();
    const newTx: FuelTransaction = {
      ...tx,
      id: 'fuel-' + Date.now(),
      transaction_number: `FUEL-${year}-${String(seq).padStart(6, '0')}`,
      created_at: new Date().toISOString()
    };
    const updated = [newTx, ...list];
    this.saveFuelTransactions(updated);
    return newTx;
  }

  static getTripReconciliations(): TripFuelReconciliation[] {
    return this.get('tripReconciliations', this.initialTripReconciliations);
  }

  static saveTripReconciliations(reconciliations: TripFuelReconciliation[]): void {
    this.set('tripReconciliations', reconciliations);
  }

  static getGpsSyncLogs(): GpsSyncLog[] {
    return this.get('gpsSyncLogs', this.initialGpsSyncLogs);
  }

  static addGpsSyncLog(log: Omit<GpsSyncLog, 'id'>): void {
    const list = this.getGpsSyncLogs();
    const newLog: GpsSyncLog = {
      ...log,
      id: 'sync-' + Date.now()
    };
    this.set('gpsSyncLogs', [newLog, ...list.slice(0, 49)]); // keep latest 50
  }
}
