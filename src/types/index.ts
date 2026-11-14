export type UserRole = 
  | 'SUPER_ADMIN'
  | 'FLEET_MANAGER'
  | 'MANAGEMENT';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
  department?: string;
  is_active: boolean;
  created_at: string;
}

export type VehicleType = 'TRACTOR_HEAD' | 'TANKER_TRAILER' | 'OTHER' | 'SMALL_VEHICLE';

export type VehicleStatus = 
  | 'AVAILABLE'
  | 'ON_TRIP'
  | 'IN_WORKSHOP'
  | 'REQUIRES INSPECTION'
  | 'OUT_OF_SERVICE'
  | 'SOLD'
  | 'RETIRED';

export type TrailerStatus = 
  | 'AVAILABLE'
  | 'ASSIGNED'
  | 'IN_WORKSHOP'
  | 'OUT_OF_SERVICE'
  | 'RETIRED';

export interface Vehicle {
  id: string;
  vehicle_id: string;
  plate_number: string;
  fleet_number: string;
  vehicle_type: VehicleType;
  make: string;
  model: string;
  year: number;
  vin: string;
  engine_number?: string;
  color: string;
  fuel_type: string;
  current_mileage: number;
  current_engine_hours: number;
  assigned_driver_id?: string;
  assigned_trailer_id?: string;
  department: string;
  station_location: string;
  status: VehicleStatus;
  purchase_date?: string;
  purchase_cost?: number;
  notes?: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface SmallVehicle {
  id: string;
  sn: number;
  plate_number: string;
  vehicle_number: string;
  model_year: number | null;
  brand: string | null;
  driver_name: string | null;
  department_location: string | null;
  created_at: string;
  updated_at: string;
}

export type SmallVehicleInput = {
  plate_number: string;
  vehicle_number: string;
  model_year?: number | null;
  brand?: string | null;
  driver_name?: string | null;
  department_location?: string | null;
};

export interface Trailer {
  id: string;
  trailer_id: string;
  trailer_number: string;
  plate_number: string;
  tank_capacity_liters: number;
  number_of_compartments: number;
  manufacturer: string;
  model: string;
  year: number;
  vin: string;
  tank_type: string;
  assigned_tractor_id?: string;
  status: TrailerStatus;
  current_location: string;
  notes?: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  profile_id?: string;
  employee_id: string;
  full_name: string;
  license_number: string;
  license_type: string;
  license_expiry: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
  notes?: string;
  created_at: string;
}

export interface Technician {
  id: string;
  profile_id?: string;
  employee_id: string;
  full_name: string;
  specialization: string;
  department: string;
  phone?: string;
  hourly_rate: number;
  status: 'ACTIVE' | 'INACTIVE';
  hire_date?: string;
  created_at: string;
}

export interface WorkshopLocation {
  id: string;
  code: string;
  name: string;
  city: string;
  address?: string;
  phone?: string;
  supervisor_id?: string;
}

export interface Supplier {
  id: string;
  supplier_code: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  tax_number?: string;
}

export type WOPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type WOStatus = 
  | 'REPORTED'
  | 'INSPECTION'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_PARTS'
  | 'WAITING_FOR_APPROVAL'
  | 'REPAIR_COMPLETED'
  | 'QC_INSPECTION'
  | 'COMPLETED'
  | 'RELEASED'
  | 'CANCELLED';

export interface WorkOrder {
  id: string;
  work_order_number: string;
  vehicle_id: string;
  trailer_id?: string;
  driver_id?: string;
  reported_by: string;
  date_reported: string;
  problem_description: string;
  priority: WOPriority;
  workshop_location_id: string;
  assigned_supervisor_id?: string;
  assigned_technician_id?: string;
  estimated_completion?: string;
  actual_completion?: string;
  status: WOStatus;
  
  diagnosis_notes?: string;
  repair_summary?: string;
  qc_inspector_id?: string;
  qc_passed?: boolean;
  qc_notes?: string;
  qc_date?: string;
  
  parts_cost: number;
  labor_cost: number;
  external_service_cost: number;
  other_cost: number;
  total_cost: number;
  
  created_at: string;
  updated_at: string;
}

export interface WorkOrderStatusHistory {
  id: string;
  work_order_id: string;
  from_status?: WOStatus;
  to_status: WOStatus;
  changed_by: string;
  notes?: string;
  created_at: string;
}

export interface WorkOrderPart {
  id: string;
  work_order_id: string;
  part_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  issued_by: string;
  created_at: string;
}

export interface WorkOrderLabor {
  id: string;
  work_order_id: string;
  technician_id: string;
  hours_worked: number;
  hourly_rate: number;
  total_cost: number;
  work_description?: string;
  date_performed: string;
}

export interface WorkOrderPhoto {
  id: string;
  work_order_id: string;
  photo_type: 'BEFORE' | 'IN_PROGRESS' | 'AFTER' | 'QC';
  photo_url: string;
  caption?: string;
  uploaded_by?: string;
  created_at: string;
}

export interface PartCategory {
  id: string;
  name: string;
  description?: string;
}

export interface Part {
  id: string;
  part_number: string;
  part_name: string;
  category_id: string;
  manufacturer?: string;
  unit: string;
  minimum_stock: number;
  maximum_stock: number;
  current_stock: number;
  location_rack: string;
  supplier_id?: string;
  unit_cost: number;
  status: string;
  created_at: string;
}

export type InventoryTransactionType = 'RECEIVE' | 'ISSUE' | 'RETURN' | 'ADJUSTMENT' | 'TRANSFER';

export interface InventoryTransaction {
  id: string;
  part_id: string;
  transaction_type: InventoryTransactionType;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  vehicle_id?: string;
  work_order_id?: string;
  performed_by: string;
  notes?: string;
  created_at: string;
}

export type PMFrequencyType = 'MILEAGE' | 'HOURS' | 'DAYS' | 'MONTHS' | 'DATE';

export type PMStatus = 'UPCOMING' | 'DUE_SOON' | 'DUE' | 'OVERDUE' | 'COMPLETED';

export interface MaintenanceTemplate {
  id: string;
  template_code: string;
  title: string;
  description?: string;
  vehicle_type: VehicleType;
  frequency_type: PMFrequencyType;
  interval_value: number;
  estimated_duration_hours: number;
}

export interface MaintenanceSchedule {
  id: string;
  template_id?: string;
  vehicle_id?: string;
  trailer_id?: string;
  title: string;
  frequency_type: PMFrequencyType;
  interval_value: number;
  last_service_mileage: number;
  last_service_hours?: number;
  last_service_date?: string;
  next_due_mileage: number;
  next_due_hours?: number;
  next_due_date?: string;
  status: PMStatus;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export type InspectionResult = 'PASS' | 'FAIL' | 'NA';
export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface VehicleInspectionItem {
  id: string;
  category: string;
  item_name: string;
  result: InspectionResult;
  severity?: SeverityLevel;
  comment?: string;
  photo_url?: string;
}

export interface VehicleInspection {
  id: string;
  inspection_number: string;
  vehicle_id: string;
  trailer_id?: string;
  driver_id?: string;
  inspector_id?: string;
  odometer_reading: number;
  inspection_date: string;
  overall_status: InspectionResult;
  has_critical_failure: boolean;
  supervisor_approved: boolean;
  created_work_order_id?: string;
  items: VehicleInspectionItem[];
  notes?: string;
  created_at: string;
}

export interface VehicleDocument {
  id: string;
  document_type: string;
  vehicle_id?: string;
  trailer_id?: string;
  document_number: string;
  issue_date?: string;
  expiry_date: string;
  issuing_authority?: string;
  attachment_url?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  updated_by?: string;
}

export interface NotificationItem {
  id: string;
  user_id?: string;
  target_role?: UserRole;
  title: string;
  message: string;
  category: 'MAINTENANCE' | 'DOCUMENT' | 'STOCK' | 'WORK_ORDER' | 'INSPECTION';
  reference_id?: string;
  is_read: boolean;
  created_at: string;
}

export type DefectReportCategory = 
  | 'Mechanical'
  | 'Electrical'
  | 'Tire'
  | 'Accident'
  | 'Other'
  | 'Engine'
  | 'Brakes'
  | 'Tires'
  | 'Lights'
  | 'Battery'
  | 'Steering'
  | 'Suspension'
  | 'Fuel System'
  | 'Tanker'
  | 'Hose'
  | 'Valve'
  | 'Coupling'
  | 'Safety Equipment';

export type DefectReportStatus =
  | 'NEW'
  | 'UNDER_REVIEW'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED'
  | 'REPORTED'
  | 'WORK_ORDER_CREATED'
  | 'SCHEDULED'
  | 'MORE_INFO_REQUESTED'
  | 'DUPLICATE';

export interface DefectReport {
  id: string;
  report_number: string;
  driver_id?: string;
  driver_name: string;
  vehicle_id: string;
  plate_number?: string;
  trailer_id?: string;
  category: DefectReportCategory;
  severity: SeverityLevel;
  description: string;
  photo_url?: string;
  location?: string;
  status: DefectReportStatus;
  assigned_maintenance_team?: string;
  internal_notes?: string;
  workshop_response?: string;
  fleet_manager_notes?: string;
  action_taken?: string;
  work_order_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name: string;
  user_role: string;
  action: string;
  module: string;
  record_id: string;
  old_values?: any;
  new_values?: any;
  ip_address: string;
  created_at: string;
}

// ====================================================================
// GPS TELEMATICS, TRIP & FUEL CONSUMPTION TYPES
// ====================================================================

export type GpsDataSource = 
  | 'LIVE_PROVIDER' 
  | 'SIMULATED_MOCK_FOR_DEV_ONLY' 
  | 'MANUAL_ODOMETER_ENTRY';

export type TripStatus = 
  | 'PLANNED'
  | 'DISPATCHED'
  | 'IN_PROGRESS'
  | 'ARRIVED_AT_DESTINATION'
  | 'UNLOADING'
  | 'COMPLETED'
  | 'CANCELLED';

export type DistanceCalcMethod = 
  | 'GPS_HAVERSINE_SUMMATION'
  | 'GPS_VINCENTY_ROAD_FILTERED'
  | 'ODOMETER_DELTA'
  | 'HYBRID_VERIFIED';

export type DataQualityStatus = 
  | 'HIGH_CONFIDENCE'
  | 'INTERPOLATED_GAPS'
  | 'ODOMETER_FALLBACK'
  | 'DEGRADED_SIGNAL'
  | 'ANOMALY_FLAGGED';

export type SyncStatusType = 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED' | 'SKIPPED';

export type FuelPaymentMethod = 
  | 'PETROMIN_CARD'
  | 'ARAMCO_BULK_DISPENSER'
  | 'COMPANY_FLEET_CARD'
  | 'CASH_REIMBURSEMENT'
  | 'WORKSHOP_INTERNAL_DISPENSER';

export interface GpsDevice {
  id: string;
  device_imei: string;
  serial_number?: string;
  device_model: string;
  firmware_version?: string;
  sim_phone_number?: string;
  sim_iccid?: string;
  installed_vehicle_id?: string;
  installation_date?: string;
  installation_odometer: number;
  is_active: boolean;
  battery_level_percent?: number;
  signal_strength_csq?: number;
  last_heartbeat?: string;
  notes?: string;
  created_at: string;
}

export interface VehicleGpsPing {
  id: string;
  device_id?: string;
  vehicle_id: string;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  heading_degrees: number;
  altitude_meters?: number;
  ignition_on: boolean;
  odometer_km?: number;
  gps_timestamp: string;
  received_at: string;
  accuracy_meters?: number;
  is_valid_point: boolean;
  data_source: GpsDataSource;
  sync_batch_id?: string;
  raw_telematics?: any;
}

export interface GpsSyncLog {
  id: string;
  sync_started_at: string;
  sync_completed_at?: string;
  provider_name: string;
  sync_status: SyncStatusType;
  pings_received: number;
  pings_inserted: number;
  pings_skipped_duplicate: number;
  pings_rejected_anomaly: number;
  error_message?: string;
  api_latency_ms?: number;
  triggered_by: string;
}

export interface Trip {
  id: string;
  trip_number: string;
  vehicle_id: string;
  assigned_driver_id?: string;
  assigned_trailer_id?: string;
  origin_name: string;
  origin_latitude?: number;
  origin_longitude?: number;
  destination_name: string;
  destination_latitude?: number;
  destination_longitude?: number;
  cargo_description: string;
  cargo_volume_liters?: number;
  is_loaded_trip: boolean;
  planned_departure?: string;
  actual_departure?: string;
  planned_arrival?: string;
  actual_arrival?: string;
  start_odometer_km?: number;
  end_odometer_km?: number;
  odometer_distance_km?: number;
  gps_calculated_distance_km: number;
  final_distance_km?: number;
  distance_calculation_method: DistanceCalcMethod;
  data_quality: DataQualityStatus;
  status: TripStatus;
  notes?: string;
  dispatched_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface VehicleFuelBenchmark {
  id: string;
  vehicle_id?: string;
  vehicle_type: VehicleType;
  make: string;
  model: string;
  empty_consumption_liters_per_100km: number;
  loaded_consumption_liters_per_100km: number;
  pto_pumping_consumption_liters_per_hour: number;
  ac_summer_penalty_percentage: number;
  effective_from: string;
  notes?: string;
  created_at: string;
}

export interface FuelTransaction {
  id: string;
  transaction_number: string;
  vehicle_id: string;
  driver_id?: string;
  transaction_date: string;
  fuel_station_name: string;
  station_city?: string;
  fuel_type: string;
  liters_dispensed: number;
  unit_cost: number;
  total_cost: number;
  odometer_at_fueling: number;
  is_full_tank: boolean;
  payment_method: FuelPaymentMethod;
  invoice_reference?: string;
  receipt_photo_url?: string;
  verified_by?: string;
  is_verified: boolean;
  created_at: string;
}

export interface TripFuelReconciliation {
  id: string;
  trip_id: string;
  vehicle_id: string;
  actual_fuel_consumed_liters: number;
  benchmark_liters_per_100km: number;
  distance_used_km: number;
  estimated_fuel_liters: number;
  variance_liters: number;
  variance_percentage: number;
  has_abnormal_variance: boolean;
  variance_reason?: string;
  reconciliation_status: 'PENDING_REVIEW' | 'APPROVED' | 'INVESTIGATION_REQUIRED';
  reviewed_by?: string;
  reconciled_at: string;
}
