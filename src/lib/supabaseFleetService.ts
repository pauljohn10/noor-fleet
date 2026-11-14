/**
 * Supabase Fleet Service - Noor Fleet ERP
 * Exclusive database access layer for all operational fleet records.
 * Direct CRUD against live Supabase PostgreSQL tables with strict schema mapping.
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { 
  Vehicle, Trailer, Driver, Technician, Part, WorkOrder, 
  MaintenanceSchedule, VehicleInspection, VehicleDocument, 
  DefectReport, Trip, GpsDevice, VehicleGpsPing, FuelTransaction, 
  VehicleFuelBenchmark, TripFuelReconciliation, GpsSyncLog, 
  AuditLog, NotificationItem, PartCategory
} from '../types';

// ============================================================================
// 1. VEHICLES
// ============================================================================
export async function fetchVehicles(): Promise<Vehicle[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[SupabaseFleet] Error fetching vehicles:', error.message);
    throw error;
  }
  return (data || []).map((v: any) => ({
    ...v,
    current_mileage: Number(v.current_mileage) || 0,
    current_engine_hours: Number(v.current_engine_hours) || 0,
    purchase_cost: Number(v.purchase_cost) || 0
  })) as Vehicle[];
}

export async function insertVehicle(vehicle: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>): Promise<Vehicle> {
  const payload: any = {
    ...vehicle,
    fleet_number: vehicle.fleet_number || vehicle.vehicle_id,
    vin: vehicle.vin || `VIN-${vehicle.vehicle_id}-${Date.now().toString(36).toUpperCase()}`,
    current_mileage: Number(vehicle.current_mileage) || 0,
    current_engine_hours: Number(vehicle.current_engine_hours) || 0,
    purchase_cost: vehicle.purchase_cost ? Number(vehicle.purchase_cost) : 0
  };

  const { data, error } = await supabase
    .from('vehicles')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('[SupabaseFleet] Error inserting vehicle:', error.message);
    throw error;
  }
  return data as Vehicle;
}

export async function updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle> {
  const payload: any = { ...updates, updated_at: new Date().toISOString() };
  if (payload.current_mileage !== undefined) payload.current_mileage = Number(payload.current_mileage);
  if (payload.current_engine_hours !== undefined) payload.current_engine_hours = Number(payload.current_engine_hours);
  if (payload.purchase_cost !== undefined) payload.purchase_cost = Number(payload.purchase_cost);

  const { data, error } = await supabase
    .from('vehicles')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[SupabaseFleet] Error updating vehicle:', error.message);
    throw error;
  }
  return data as Vehicle;
}

export async function deleteVehicle(id: string): Promise<void> {
  const { error } = await supabase.from('vehicles').delete().eq('id', id);
  if (error) {
    console.error('[SupabaseFleet] Error deleting vehicle:', error.message);
    throw error;
  }
}

// ============================================================================
// 2. TRAILERS
// ============================================================================
export async function fetchTrailers(): Promise<Trailer[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('trailers')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[SupabaseFleet] Error fetching trailers:', error.message);
    throw error;
  }
  return (data || []).map((t: any) => ({
    ...t,
    tank_capacity_liters: Number(t.tank_capacity_liters) || 0,
    number_of_compartments: Number(t.number_of_compartments) || 1,
    year: Number(t.year) || new Date().getFullYear()
  })) as Trailer[];
}

export async function insertTrailer(trailer: Omit<Trailer, 'id' | 'created_at' | 'updated_at'>): Promise<Trailer> {
  const payload: any = {
    ...trailer,
    trailer_number: trailer.trailer_number || trailer.trailer_id,
    vin: trailer.vin || `VIN-${trailer.trailer_id}-${Date.now().toString(36).toUpperCase()}`,
    tank_capacity_liters: Number(trailer.tank_capacity_liters) || 36000,
    number_of_compartments: Number(trailer.number_of_compartments) || 4,
    year: Number(trailer.year) || new Date().getFullYear()
  };

  const { data, error } = await supabase
    .from('trailers')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('[SupabaseFleet] Error inserting trailer:', error.message);
    throw error;
  }
  return data as Trailer;
}

export async function updateTrailer(id: string, updates: Partial<Trailer>): Promise<Trailer> {
  const payload: any = { ...updates, updated_at: new Date().toISOString() };
  if (payload.tank_capacity_liters !== undefined) payload.tank_capacity_liters = Number(payload.tank_capacity_liters);
  if (payload.number_of_compartments !== undefined) payload.number_of_compartments = Number(payload.number_of_compartments);

  const { data, error } = await supabase
    .from('trailers')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[SupabaseFleet] Error updating trailer:', error.message);
    throw error;
  }
  return data as Trailer;
}

export async function deleteTrailer(id: string): Promise<void> {
  const { error } = await supabase.from('trailers').delete().eq('id', id);
  if (error) {
    console.error('[SupabaseFleet] Error deleting trailer:', error.message);
    throw error;
  }
}

// ============================================================================
// 3. DRIVERS
// ============================================================================
export async function fetchDrivers(): Promise<Driver[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[SupabaseFleet] Error fetching drivers:', error.message);
    throw error;
  }
  return (data || []) as Driver[];
}

export async function insertDriver(driver: Omit<Driver, 'id' | 'created_at'>): Promise<Driver> {
  const payload: any = {
    ...driver,
    license_expiry: driver.license_expiry || new Date(Date.now() + 365 * 86400000).toISOString()
  };

  const { data, error } = await supabase
    .from('drivers')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('[SupabaseFleet] Error inserting driver:', error.message);
    throw error;
  }
  return data as Driver;
}

export async function updateDriver(id: string, updates: Partial<Driver>): Promise<Driver> {
  const { data, error } = await supabase
    .from('drivers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[SupabaseFleet] Error updating driver:', error.message);
    throw error;
  }
  return data as Driver;
}

export async function deleteDriver(id: string): Promise<void> {
  const { error } = await supabase.from('drivers').delete().eq('id', id);
  if (error) {
    console.error('[SupabaseFleet] Error deleting driver:', error.message);
    throw error;
  }
}

// ============================================================================
// 4. TECHNICIANS
// ============================================================================
export async function fetchTechnicians(): Promise<Technician[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('technicians')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[SupabaseFleet] Error fetching technicians:', error.message);
    throw error;
  }
  return (data || []).map((t: any) => ({
    ...t,
    hourly_rate: Number(t.hourly_rate) || 45.00
  })) as Technician[];
}

export async function insertTechnician(tech: Omit<Technician, 'id' | 'created_at'>): Promise<Technician> {
  const payload: any = {
    ...tech,
    phone: tech.phone || '+966 50 000 0000',
    hourly_rate: Number(tech.hourly_rate) || 45.00
  };

  const { data, error } = await supabase
    .from('technicians')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('[SupabaseFleet] Error inserting technician:', error.message);
    throw error;
  }
  return data as Technician;
}

// ============================================================================
// 5. SPARE PARTS & INVENTORY
// ============================================================================
export async function fetchParts(): Promise<Part[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('parts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[SupabaseFleet] Error fetching parts:', error.message);
    throw error;
  }
  return (data || []).map((p: any) => ({
    ...p,
    unit_cost: Number(p.unit_cost) || 0,
    current_stock: Number(p.current_stock) || 0,
    minimum_stock: Number(p.minimum_stock) || 0,
    maximum_stock: Number(p.maximum_stock) || 0
  })) as Part[];
}

export async function fetchPartCategories(): Promise<PartCategory[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('part_categories').select('*');
  if (error) {
    console.error('[SupabaseFleet] Error fetching categories:', error.message);
    return [];
  }
  return (data || []) as PartCategory[];
}

export async function insertPart(part: Omit<Part, 'id' | 'created_at'>): Promise<Part> {
  const payload: any = {
    ...part,
    current_stock: Number(part.current_stock) || 0,
    minimum_stock: Number(part.minimum_stock) || 5,
    maximum_stock: Number(part.maximum_stock) || 100,
    unit_cost: Number(part.unit_cost) || 0
  };

  const { data, error } = await supabase
    .from('parts')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('[SupabaseFleet] Error inserting part:', error.message);
    throw error;
  }
  return data as Part;
}

export async function updatePart(id: string, updates: Partial<Part>): Promise<Part> {
  const payload: any = { ...updates };
  if (payload.unit_cost !== undefined) payload.unit_cost = Number(payload.unit_cost);
  if (payload.current_stock !== undefined) payload.current_stock = Number(payload.current_stock);
  if (payload.minimum_stock !== undefined) payload.minimum_stock = Number(payload.minimum_stock);

  const { data, error } = await supabase
    .from('parts')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[SupabaseFleet] Error updating part:', error.message);
    throw error;
  }
  return data as Part;
}

export async function deletePart(id: string): Promise<void> {
  const { error } = await supabase.from('parts').delete().eq('id', id);
  if (error) {
    console.error('[SupabaseFleet] Error deleting part:', error.message);
    throw error;
  }
}

export async function recordInventoryTransaction(tx: {
  part_id: string;
  transaction_type: 'PURCHASE' | 'ISSUANCE' | 'RETURN' | 'ADJUSTMENT' | 'SCRAP';
  quantity: number;
  unit_price: number;
  work_order_id?: string;
  reference_number?: string;
  performed_by?: string;
  notes?: string;
}): Promise<void> {
  if (!isSupabaseConfigured) return;
  const payload: any = {
    ...tx,
    total_cost: Math.abs(tx.quantity * tx.unit_price),
    performed_by: tx.performed_by || 'Workshop Staff'
  };
  const { error } = await supabase.from('inventory_transactions').insert([payload]);
  if (error) {
    console.warn('[SupabaseFleet] Inventory transaction log notice:', error.message);
  }
}

// ============================================================================
// 6. WORK ORDERS (JOB CARDS)
// ============================================================================
export async function fetchWorkOrders(): Promise<WorkOrder[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('work_orders')
    .select(`
      *,
      work_order_parts(*),
      work_order_labor(*),
      work_order_photos(*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[SupabaseFleet] Error fetching work orders:', error.message);
    throw error;
  }

  return (data || []).map((w: any) => ({
    id: w.id,
    work_order_number: w.wo_number || w.work_order_number || `WO-${w.id.slice(0, 8)}`,
    vehicle_id: w.vehicle_id,
    trailer_id: w.trailer_id,
    driver_id: w.driver_id,
    reported_by: w.reported_by || 'Fleet Operations',
    date_reported: w.date_reported || w.created_at,
    problem_description: w.problem_description,
    priority: w.priority || 'MEDIUM',
    status: w.status || 'REPORTED',
    workshop_location_id: w.workshop_location_id || '10000000-0000-0000-0000-000000000001',
    assigned_supervisor_id: w.assigned_supervisor_id,
    assigned_technician_id: w.assigned_technician_id,
    estimated_completion: w.estimated_completion,
    actual_completion: w.actual_completion,
    parts_cost: Number(w.parts_cost) || 0,
    labor_cost: Number(w.labor_cost) || 0,
    external_service_cost: Number(w.external_service_cost) || 0,
    other_cost: Number(w.other_cost) || 0,
    total_cost: Number(w.total_cost) || (Number(w.parts_cost) || 0) + (Number(w.labor_cost) || 0),
    parts: (w.work_order_parts || []).map((p: any) => ({
      id: p.id,
      work_order_id: p.work_order_id,
      part_id: p.part_id,
      quantity: Number(p.quantity) || 1,
      unit_cost: Number(p.unit_price || p.unit_cost) || 0,
      total_cost: Number(p.total_price || p.total_cost) || 0,
      issued_by: p.issued_by || 'Storekeeper',
      created_at: p.created_at
    })),
    labor: (w.work_order_labor || []).map((l: any) => ({
      id: l.id,
      work_order_id: l.work_order_id,
      technician_id: l.technician_id,
      hours_worked: Number(l.hours_worked) || 0,
      hourly_rate: Number(l.hourly_rate) || 45.00,
      total_cost: Number(l.total_cost) || 0,
      work_description: l.task_description || l.work_description || '',
      date_performed: l.date_performed || l.created_at?.slice(0, 10),
      created_at: l.created_at
    })),
    photos: (w.work_order_photos || []).map((ph: any) => ({
      id: ph.id,
      work_order_id: ph.work_order_id,
      photo_type: ph.photo_type || 'BEFORE',
      photo_url: ph.photo_url,
      caption: ph.caption,
      uploaded_by: ph.uploaded_by,
      created_at: ph.uploaded_at || ph.created_at
    })),
    created_at: w.created_at,
    updated_at: w.updated_at
  })) as WorkOrder[];
}

export async function insertWorkOrder(wo: Partial<WorkOrder>): Promise<WorkOrder> {
  const autoWoNum = wo.work_order_number || `WO-2026-${Math.floor(100000 + Math.random() * 900000)}`;
  const payload: any = {
    wo_number: autoWoNum,
    vehicle_id: wo.vehicle_id,
    trailer_id: wo.trailer_id || null,
    driver_id: wo.driver_id || null,
    reported_by: wo.reported_by || 'Fleet Manager',
    problem_description: wo.problem_description || 'Scheduled Maintenance',
    priority: wo.priority || 'MEDIUM',
    status: wo.status || 'REPORTED',
    workshop_location_id: wo.workshop_location_id || '10000000-0000-0000-0000-000000000001',
    assigned_technician_id: wo.assigned_technician_id || null,
    estimated_completion: wo.estimated_completion || null,
    parts_cost: Number(wo.parts_cost) || 0,
    labor_cost: Number(wo.labor_cost) || 0,
    total_cost: Number(wo.total_cost) || 0,
    internal_notes: wo.diagnosis_notes || ''
  };

  const { data, error } = await supabase
    .from('work_orders')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('[SupabaseFleet] Error inserting work order:', error.message);
    throw error;
  }

  return {
    ...data,
    work_order_number: data.wo_number,
    parts: [],
    labor: [],
    photos: []
  } as WorkOrder;
}

export async function updateWorkOrderStatus(
  id: string,
  toStatus: string,
  notes?: string,
  changedBy?: string
): Promise<void> {
  const { error } = await supabase
    .from('work_orders')
    .update({ status: toStatus, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[SupabaseFleet] Error updating work order status:', error.message);
    throw error;
  }

  // Insert status history
  await supabase.from('work_order_status_history').insert([{
    work_order_id: id,
    to_status: toStatus,
    change_notes: notes || `Status changed to ${toStatus}`,
    changed_by: null
  }]);
}

export async function addWorkOrderPartToDb(partData: {
  work_order_id: string;
  part_id: string;
  quantity: number;
  unit_price: number;
}): Promise<void> {
  const payload = {
    work_order_id: partData.work_order_id,
    part_id: partData.part_id,
    quantity: partData.quantity,
    unit_price: partData.unit_price,
    total_price: partData.quantity * partData.unit_price
  };

  const { error } = await supabase.from('work_order_parts').insert([payload]);
  if (error) throw error;

  // Deduct parts stock
  const { data: part } = await supabase.from('parts').select('current_stock').eq('id', partData.part_id).single();
  if (part) {
    const updatedStock = Math.max(0, (part.current_stock || 0) - partData.quantity);
    await supabase.from('parts').update({ current_stock: updatedStock }).eq('id', partData.part_id);
    await recordInventoryTransaction({
      part_id: partData.part_id,
      transaction_type: 'ISSUANCE',
      quantity: -partData.quantity,
      unit_price: partData.unit_price,
      work_order_id: partData.work_order_id
    });
  }
}

export async function addWorkOrderLaborToDb(laborData: {
  work_order_id: string;
  technician_id: string;
  hours_worked: number;
  hourly_rate: number;
  task_description: string;
}): Promise<void> {
  const payload = {
    work_order_id: laborData.work_order_id,
    technician_id: laborData.technician_id,
    hours_worked: laborData.hours_worked,
    hourly_rate: laborData.hourly_rate,
    total_cost: laborData.hours_worked * laborData.hourly_rate,
    task_description: laborData.task_description
  };
  const { error } = await supabase.from('work_order_labor').insert([payload]);
  if (error) throw error;
}

// ============================================================================
// 7. PREVENTIVE MAINTENANCE SCHEDULES
// ============================================================================
export async function fetchMaintenanceSchedules(): Promise<MaintenanceSchedule[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('maintenance_schedules')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[SupabaseFleet] Error fetching schedules:', error.message);
    throw error;
  }

  return (data || []).map((s: any) => ({
    id: s.id,
    title: s.title,
    vehicle_id: s.vehicle_id,
    trailer_id: s.trailer_id,
    frequency_type: s.frequency_type || 'DAYS',
    interval_value: Number(s.frequency_value || s.interval_value) || 30,
    last_service_mileage: Number(s.last_service_km || s.last_service_mileage) || 0,
    last_service_date: s.last_service_date,
    next_due_mileage: Number(s.next_due_km || s.next_due_mileage) || 0,
    next_due_date: s.next_due_date,
    status: s.status || 'SCHEDULED',
    notes: s.notes,
    created_at: s.created_at
  })) as MaintenanceSchedule[];
}

export async function insertMaintenanceSchedule(
  schedule: Omit<MaintenanceSchedule, 'id' | 'created_at'>
): Promise<MaintenanceSchedule> {
  const payload: any = {
    title: schedule.title,
    vehicle_id: schedule.vehicle_id || null,
    trailer_id: schedule.trailer_id || null,
    frequency_type: schedule.frequency_type,
    frequency_value: Number(schedule.interval_value) || 30,
    last_service_date: schedule.last_service_date || null,
    last_service_km: Number(schedule.last_service_mileage) || 0,
    next_due_date: schedule.next_due_date || null,
    next_due_km: Number(schedule.next_due_mileage) || 0,
    status: schedule.status || 'SCHEDULED',
    notes: schedule.notes || null
  };

  const { data, error } = await supabase
    .from('maintenance_schedules')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('[SupabaseFleet] Error inserting schedule:', error.message);
    throw error;
  }

  return {
    ...data,
    interval_value: data.frequency_value,
    last_service_mileage: data.last_service_km,
    next_due_mileage: data.next_due_km
  } as MaintenanceSchedule;
}

export async function updateMaintenanceScheduleStatus(
  id: string,
  status: string,
  notes?: string
): Promise<void> {
  const updates: any = { status, updated_at: new Date().toISOString() };
  if (notes) updates.notes = notes;
  const { error } = await supabase.from('maintenance_schedules').update(updates).eq('id', id);
  if (error) throw error;
}

// ============================================================================
// 8. VEHICLE INSPECTIONS
// ============================================================================
export async function fetchVehicleInspections(): Promise<VehicleInspection[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('vehicle_inspections')
    .select('*, vehicle_inspection_items(*)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[SupabaseFleet] Error fetching inspections:', error.message);
    throw error;
  }

  return (data || []).map((ins: any) => ({
    id: ins.id,
    inspection_number: ins.inspection_number,
    vehicle_id: ins.vehicle_id,
    trailer_id: ins.trailer_id,
    inspector_id: ins.inspector_id,
    odometer_reading: Number(ins.odometer_reading) || 0,
    inspection_date: ins.inspected_at || ins.inspection_date || ins.created_at,
    overall_status: ins.overall_result || ins.overall_status || 'PASS',
    has_critical_failure: ins.has_critical_failure ?? false,
    supervisor_approved: ins.supervisor_approved ?? true,
    created_work_order_id: ins.created_work_order_id,
    items: (ins.vehicle_inspection_items || []).map((item: any) => ({
      id: item.id,
      category: item.category,
      item_name: item.item_name,
      result: item.result,
      severity: item.severity || 'LOW',
      comment: item.remarks || item.comment,
      photo_url: item.photo_url
    })),
    notes: ins.notes,
    created_at: ins.created_at
  })) as VehicleInspection[];
}

export async function insertVehicleInspection(
  ins: Omit<VehicleInspection, 'id' | 'inspection_number' | 'created_at'>
): Promise<VehicleInspection> {
  const autoNum = `INS-2026-${Math.floor(100000 + Math.random() * 900000)}`;
  const payload: any = {
    inspection_number: autoNum,
    vehicle_id: ins.vehicle_id,
    trailer_id: ins.trailer_id || null,
    odometer_reading: Number(ins.odometer_reading) || 0,
    overall_result: ins.overall_status || 'PASS',
    inspector_name: 'Verified Fleet Inspector',
    notes: ins.notes || ''
  };

  const { data, error } = await supabase
    .from('vehicle_inspections')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;

  // Insert items
  if (ins.items && ins.items.length > 0) {
    const itemsPayload = ins.items.map(item => ({
      inspection_id: data.id,
      category: item.category,
      item_name: item.item_name,
      result: item.result,
      remarks: item.comment || ''
    }));
    await supabase.from('vehicle_inspection_items').insert(itemsPayload);
  }

  return {
    ...data,
    overall_status: data.overall_result,
    items: ins.items || []
  } as VehicleInspection;
}

// ============================================================================
// 9. VEHICLE DOCUMENTS
// ============================================================================
export async function fetchVehicleDocuments(): Promise<VehicleDocument[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('vehicle_documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[SupabaseFleet] Error fetching documents:', error.message);
    throw error;
  }
  return (data || []) as VehicleDocument[];
}

export async function insertVehicleDocument(doc: Omit<VehicleDocument, 'id' | 'created_at'>): Promise<VehicleDocument> {
  const { data, error } = await supabase
    .from('vehicle_documents')
    .insert([doc])
    .select()
    .single();
  if (error) throw error;
  return data as VehicleDocument;
}

export async function updateVehicleDocument(id: string, updates: Partial<VehicleDocument>): Promise<VehicleDocument> {
  const { data, error } = await supabase
    .from('vehicle_documents')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as VehicleDocument;
}

export async function deleteVehicleDocument(id: string): Promise<void> {
  const { error } = await supabase.from('vehicle_documents').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================================
// 10. DEFECT REPORTS
// ============================================================================
export async function fetchDefectReports(): Promise<DefectReport[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('defect_reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[SupabaseFleet] Error fetching defect reports:', error.message);
    throw error;
  }
  return (data || []) as DefectReport[];
}

export async function updateDefectReportInDb(id: string, updates: Partial<DefectReport>): Promise<void> {
  // Allowlist: only send columns that exist in the live DB schema.
  // If a column is missing from the DB it causes a 400; keep this list
  // in sync with supabase/migrations.
  const ALLOWED_COLUMNS: (keyof DefectReport)[] = [
    'status', 'workshop_response', 'fleet_manager_notes', 'action_taken',
    'work_order_id', 'assigned_maintenance_team', 'internal_notes', 'severity',
  ];
  const safeUpdates = Object.fromEntries(
    Object.entries(updates).filter(([k]) => ALLOWED_COLUMNS.includes(k as keyof DefectReport))
  );
  const { error } = await supabase
    .from('defect_reports')
    .update({ ...safeUpdates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ============================================================================
// 11. TELEMATICS & TRIPS
// ============================================================================
export async function fetchTrips(): Promise<Trip[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data || []).map((tr: any) => ({
    ...tr,
    cargo_volume_liters: Number(tr.cargo_volume_liters) || 0,
    start_odometer_km: Number(tr.start_odometer_km) || 0,
    final_odometer_km: Number(tr.final_odometer_km) || 0,
    gps_calculated_distance_km: Number(tr.gps_calculated_distance_km) || 0,
    manual_distance_km: Number(tr.manual_distance_km) || 0
  })) as Trip[];
}

export async function insertTrip(trip: Omit<Trip, 'id' | 'trip_number' | 'created_at'>): Promise<Trip> {
  const autoTripNum = `TRIP-2026-${Math.floor(100000 + Math.random() * 900000)}`;
  const { data, error } = await supabase
    .from('trips')
    .insert([{ ...trip, trip_number: autoTripNum }])
    .select()
    .single();
  if (error) throw error;
  return data as Trip;
}

export async function fetchGpsDevices(): Promise<GpsDevice[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('gps_devices')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data || []).map((g: any) => ({
    ...g,
    installation_odometer: Number(g.installation_odometer) || 0
  })) as GpsDevice[];
}

export async function fetchFuelTransactions(): Promise<FuelTransaction[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('fuel_transactions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data || []).map((f: any) => ({
    ...f,
    liters_dispensed: Number(f.liters_dispensed) || 0,
    unit_cost: Number(f.unit_cost) || 0,
    total_cost: Number(f.total_cost) || 0,
    odometer_at_fueling: Number(f.odometer_at_fueling) || 0
  })) as FuelTransaction[];
}

// ============================================================================
// 12. AUDIT LOGS & NOTIFICATIONS
// ============================================================================
export async function fetchAuditLogs(): Promise<AuditLog[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(200);

  if (error) {
    console.warn('[SupabaseFleet] Could not fetch audit logs:', error.message);
    return [];
  }

  return (data || []).map((l: any) => ({
    id: l.id,
    user_name: l.performed_by || 'Staff',
    user_role: 'FLEET_MANAGER',
    action: l.action,
    module: l.module,
    record_id: l.target_id || '',
    new_values: l.details,
    ip_address: l.ip_address || '127.0.0.1',
    created_at: l.timestamp
  })) as AuditLog[];
}

export async function insertAuditLog(log: {
  action: string;
  module: string;
  performed_by: string;
  target_id?: string;
  details?: any;
}): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.from('audit_logs').insert([{
    action: log.action,
    module: log.module,
    performed_by: log.performed_by,
    target_id: log.target_id || '',
    details: log.details || {},
    timestamp: new Date().toISOString()
  }]);
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return [];
  return (data || []).map((n: any) => ({
    id: n.id,
    user_id: n.user_id,
    title: n.title,
    message: n.message,
    category: n.category || 'WORK_ORDER',
    is_read: n.is_read ?? false,
    created_at: n.created_at || new Date().toISOString()
  })) as NotificationItem[];
}
