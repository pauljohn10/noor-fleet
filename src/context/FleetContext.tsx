import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  Vehicle, Trailer, Driver, Technician, WorkOrder, Part, 
  MaintenanceSchedule, PMStatus, VehicleInspection, VehicleDocument, 
  NotificationItem, AuditLog, WOStatus, DefectReport, DefectReportCategory, SeverityLevel,
  GpsDevice, VehicleGpsPing, GpsSyncLog, Trip, VehicleFuelBenchmark, FuelTransaction, TripFuelReconciliation
} from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { LocalStorageRepository } from '../lib/storage';
import * as dbService from '../lib/supabaseFleetService';

export type DateFilterOption = 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'ALL' | 'CUSTOM';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface FleetContextType {
  vehicles: Vehicle[];
  trailers: Trailer[];
  drivers: Driver[];
  technicians: Technician[];
  workOrders: WorkOrder[];
  parts: Part[];
  schedules: MaintenanceSchedule[];
  inspections: VehicleInspection[];
  documents: VehicleDocument[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
  defectReports: DefectReport[];
  
  // Telematics & Fuel
  trips: Trip[];
  gpsDevices: GpsDevice[];
  gpsPings: VehicleGpsPing[];
  fuelTransactions: FuelTransaction[];
  fuelBenchmarks: VehicleFuelBenchmark[];
  tripReconciliations: TripFuelReconciliation[];
  gpsSyncLogs: GpsSyncLog[];
  isGpsProviderConnected: boolean;

  // Status & Connectivity
  isLoadingData: boolean;
  databaseError: string | null;

  // Filtering
  dateFilter: DateFilterOption;
  setDateFilter: (option: DateFilterOption) => void;
  customDateRange: DateRange;
  setCustomDateRange: (range: DateRange) => void;

  // Actions
  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>) => Promise<Vehicle>;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => Promise<Vehicle>;
  deleteVehicle: (id: string) => Promise<void>;
  
  addTrailer: (trailer: Omit<Trailer, 'id' | 'created_at' | 'updated_at'>) => Promise<Trailer>;
  updateTrailer: (id: string, trailer: Partial<Trailer>) => Promise<Trailer>;
  deleteTrailer: (id: string) => Promise<void>;

  addDriver: (driver: Omit<Driver, 'id' | 'created_at'>) => Promise<Driver>;
  updateDriver: (id: string, driver: Partial<Driver>) => Promise<Driver>;
  deleteDriver: (id: string) => Promise<void>;

  addPart: (part: Omit<Part, 'id' | 'created_at'>) => Promise<Part>;
  updatePart: (id: string, part: Partial<Part>) => Promise<Part>;
  deletePart: (id: string) => Promise<void>;

  addWorkOrder: (wo: Partial<WorkOrder>) => Promise<WorkOrder>;
  updateWorkOrderStatus: (id: string, toStatus: WOStatus, notes?: string, changedBy?: string) => Promise<void>;
  addWorkOrderPart: (woId: string, partId: string, qty: number, issuedBy?: string) => Promise<void>;
  addWorkOrderLabor: (woId: string, techId: string, hours: number, description?: string) => Promise<void>;

  issuePartStock: (partId: string, qty: number, woId?: string, vehicleId?: string, performedBy?: string) => Promise<boolean>;
  receivePartStock: (partId: string, qty: number, unitCost: number, performedBy?: string) => Promise<void>;
  adjustPartStock: (partId: string, newStock: number, notes: string, performedBy?: string) => Promise<void>;

  submitInspection: (inspection: Omit<VehicleInspection, 'id' | 'inspection_number' | 'created_at'>) => Promise<VehicleInspection>;
  submitDefectReport: (report: Omit<DefectReport, 'id' | 'report_number' | 'created_at'>) => Promise<void>;
  submitPublicDriverReport: (input: {
    driver_name: string;
    plate_number: string;
    category: DefectReportCategory;
    description: string;
    photo_url?: string;
    website_url?: string;
  }) => Promise<{
    success: boolean;
    report_number?: string;
    submitted_at?: string;
    vehicle_id?: string;
    plate_number?: string;
    error?: string;
  }>;
  updateDefectReport: (id: string, updates: Partial<DefectReport>, updatedBy?: string) => Promise<boolean>;
  addMaintenanceSchedule: (schedule: Omit<MaintenanceSchedule, 'id' | 'created_at'>) => Promise<MaintenanceSchedule>;
  updateMaintenanceScheduleStatus: (id: string, status: PMStatus, notes?: string, changedBy?: string) => Promise<boolean>;
  updateMaintenanceSchedule: (id: string, updates: Partial<MaintenanceSchedule>, changedBy?: string) => Promise<boolean>;
  addDocument: (doc: Omit<VehicleDocument, 'id' | 'created_at'>, addedBy?: string) => Promise<VehicleDocument>;
  updateDocument: (id: string, updates: Partial<VehicleDocument>, changedBy?: string) => Promise<boolean>;
  deleteDocument: (id: string, changedBy?: string) => Promise<boolean>;
  markNotificationRead: (id: string) => Promise<void>;

  // Telematics & Fuel Actions
  addGpsDevice: (device: Omit<GpsDevice, 'id' | 'created_at'>) => Promise<GpsDevice>;
  updateGpsDevice: (id: string, updates: Partial<GpsDevice>) => Promise<void>;
  deleteGpsDevice: (id: string) => Promise<void>;
  addTrip: (trip: Omit<Trip, 'id' | 'trip_number' | 'created_at'>) => Promise<Trip>;
  updateTrip: (id: string, updates: Partial<Trip>) => Promise<void>;
  addFuelTransaction: (tx: Omit<FuelTransaction, 'id' | 'transaction_number' | 'created_at'>) => Promise<FuelTransaction>;
  reconcileTripFuel: (tripId: string) => TripFuelReconciliation | null;
  simulateGpsSync: () => void;
  refreshData: () => Promise<void>;
}

const FleetContext = createContext<FleetContextType | undefined>(undefined);

export const FleetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Pure Supabase states (Zero mock data)
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [inspections, setInspections] = useState<VehicleInspection[]>([]);
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [defectReports, setDefectReports] = useState<DefectReport[]>([]);

  // Telematics & Fuel State
  const [trips, setTrips] = useState<Trip[]>([]);
  const [gpsDevices, setGpsDevices] = useState<GpsDevice[]>([]);
  const [gpsPings, setGpsPings] = useState<VehicleGpsPing[]>([]);
  const [fuelTransactions, setFuelTransactions] = useState<FuelTransaction[]>([]);
  const [fuelBenchmarks, setFuelBenchmarks] = useState<VehicleFuelBenchmark[]>([]);
  const [tripReconciliations, setTripReconciliations] = useState<TripFuelReconciliation[]>([]);
  const [gpsSyncLogs, setGpsSyncLogs] = useState<GpsSyncLog[]>([]);

  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [databaseError, setDatabaseError] = useState<string | null>(null);

  const [dateFilter, setDateFilter] = useState<DateFilterOption>('ALL');
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10)
  });

  // Purge legacy local mock data on startup
  useEffect(() => {
    LocalStorageRepository.clearLegacyMockData();
  }, []);

  /**
   * Refresh all operational records strictly from Supabase
   */
  const refreshData = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setDatabaseError('Supabase backend is not configured.');
      setIsLoadingData(false);
      return;
    }

    setIsLoadingData(true);
    setDatabaseError(null);

    try {
      const [
        vehList, trlList, drvList, techList, partList,
        woList, schedList, insList, docList, repList,
        tripList, devList, fuelList, auditList, notifList
      ] = await Promise.all([
        dbService.fetchVehicles().catch(err => { console.warn('Vehicles fetch:', err); return []; }),
        dbService.fetchTrailers().catch(err => { console.warn('Trailers fetch:', err); return []; }),
        dbService.fetchDrivers().catch(err => { console.warn('Drivers fetch:', err); return []; }),
        dbService.fetchTechnicians().catch(err => { console.warn('Technicians fetch:', err); return []; }),
        dbService.fetchParts().catch(err => { console.warn('Parts fetch:', err); return []; }),
        dbService.fetchWorkOrders().catch(err => { console.warn('WorkOrders fetch:', err); return []; }),
        dbService.fetchMaintenanceSchedules().catch(err => { console.warn('Schedules fetch:', err); return []; }),
        dbService.fetchVehicleInspections().catch(err => { console.warn('Inspections fetch:', err); return []; }),
        dbService.fetchVehicleDocuments().catch(err => { console.warn('Documents fetch:', err); return []; }),
        dbService.fetchDefectReports().catch(err => { console.warn('Defects fetch:', err); return []; }),
        dbService.fetchTrips().catch(err => { console.warn('Trips fetch:', err); return []; }),
        dbService.fetchGpsDevices().catch(err => { console.warn('GPS Devices fetch:', err); return []; }),
        dbService.fetchFuelTransactions().catch(err => { console.warn('Fuel fetch:', err); return []; }),
        dbService.fetchAuditLogs().catch(err => { console.warn('Audit fetch:', err); return []; }),
        dbService.fetchNotifications().catch(err => { console.warn('Notifications fetch:', err); return []; })
      ]);

      setVehicles(vehList);
      setTrailers(trlList);
      setDrivers(drvList);
      setTechnicians(techList);
      setParts(partList);
      setWorkOrders(woList);
      setSchedules(schedList);
      setInspections(insList);
      setDocuments(docList);
      setDefectReports(repList);
      setTrips(tripList);
      setGpsDevices(devList);
      setFuelTransactions(fuelList);
      setAuditLogs(auditList);
      setNotifications(notifList);
    } catch (err: any) {
      console.error('[FleetContext] Exception querying Supabase:', err);
      setDatabaseError(err?.message || 'Failed to sync with Supabase database.');
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // ============================================================================
  // ACTIONS: VEHICLES
  // ============================================================================
  const addVehicle = async (vehData: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>): Promise<Vehicle> => {
    const created = await dbService.insertVehicle(vehData);
    await dbService.insertAuditLog({
      action: 'CREATE',
      module: 'VEHICLES',
      performed_by: 'Staff',
      target_id: created.vehicle_id,
      details: created
    });
    await refreshData();
    return created;
  };

  const updateVehicle = async (id: string, updates: Partial<Vehicle>): Promise<Vehicle> => {
    const updated = await dbService.updateVehicle(id, updates);
    await dbService.insertAuditLog({
      action: 'UPDATE',
      module: 'VEHICLES',
      performed_by: 'Staff',
      target_id: updated.vehicle_id,
      details: updates
    });
    await refreshData();
    return updated;
  };

  const deleteVehicle = async (id: string): Promise<void> => {
    await dbService.deleteVehicle(id);
    await dbService.insertAuditLog({
      action: 'DELETE',
      module: 'VEHICLES',
      performed_by: 'Staff',
      target_id: id
    });
    await refreshData();
  };

  // ============================================================================
  // ACTIONS: TRAILERS
  // ============================================================================
  const addTrailer = async (trailerData: Omit<Trailer, 'id' | 'created_at' | 'updated_at'>): Promise<Trailer> => {
    const created = await dbService.insertTrailer(trailerData);
    await dbService.insertAuditLog({
      action: 'CREATE',
      module: 'TRAILERS',
      performed_by: 'Staff',
      target_id: created.trailer_id,
      details: created
    });
    await refreshData();
    return created;
  };

  const updateTrailer = async (id: string, updates: Partial<Trailer>): Promise<Trailer> => {
    const updated = await dbService.updateTrailer(id, updates);
    await dbService.insertAuditLog({
      action: 'UPDATE',
      module: 'TRAILERS',
      performed_by: 'Staff',
      target_id: updated.trailer_id,
      details: updates
    });
    await refreshData();
    return updated;
  };

  const deleteTrailer = async (id: string): Promise<void> => {
    await dbService.deleteTrailer(id);
    await dbService.insertAuditLog({
      action: 'DELETE',
      module: 'TRAILERS',
      performed_by: 'Staff',
      target_id: id
    });
    await refreshData();
  };

  // ============================================================================
  // ACTIONS: DRIVERS
  // ============================================================================
  const addDriver = async (driverData: Omit<Driver, 'id' | 'created_at'>): Promise<Driver> => {
    const created = await dbService.insertDriver(driverData);
    await dbService.insertAuditLog({
      action: 'CREATE',
      module: 'DRIVERS',
      performed_by: 'Staff',
      target_id: created.employee_id,
      details: created
    });
    await refreshData();
    return created;
  };

  const updateDriver = async (id: string, updates: Partial<Driver>): Promise<Driver> => {
    const updated = await dbService.updateDriver(id, updates);
    await dbService.insertAuditLog({
      action: 'UPDATE',
      module: 'DRIVERS',
      performed_by: 'Staff',
      target_id: updated.employee_id,
      details: updates
    });
    await refreshData();
    return updated;
  };

  const deleteDriver = async (id: string): Promise<void> => {
    await dbService.deleteDriver(id);
    await dbService.insertAuditLog({
      action: 'DELETE',
      module: 'DRIVERS',
      performed_by: 'Staff',
      target_id: id
    });
    await refreshData();
  };

  // ============================================================================
  // ACTIONS: SPARE PARTS & INVENTORY
  // ============================================================================
  const addPart = async (partData: Omit<Part, 'id' | 'created_at'>): Promise<Part> => {
    const created = await dbService.insertPart(partData);
    await dbService.insertAuditLog({
      action: 'CREATE',
      module: 'PARTS',
      performed_by: 'Storekeeper',
      target_id: created.part_number,
      details: created
    });
    await refreshData();
    return created;
  };

  const updatePart = async (id: string, updates: Partial<Part>): Promise<Part> => {
    const updated = await dbService.updatePart(id, updates);
    await dbService.insertAuditLog({
      action: 'UPDATE',
      module: 'PARTS',
      performed_by: 'Storekeeper',
      target_id: updated.part_number,
      details: updates
    });
    await refreshData();
    return updated;
  };

  const deletePart = async (id: string): Promise<void> => {
    await dbService.deletePart(id);
    await dbService.insertAuditLog({
      action: 'DELETE',
      module: 'PARTS',
      performed_by: 'Storekeeper',
      target_id: id
    });
    await refreshData();
  };

  const issuePartStock = async (
    partId: string,
    qty: number,
    woId?: string,
    vehicleId?: string,
    performedBy: string = 'Storekeeper'
  ): Promise<boolean> => {
    const target = parts.find(p => p.id === partId);
    if (!target || target.current_stock < qty) return false;

    const newStock = target.current_stock - qty;
    await dbService.updatePart(partId, { current_stock: newStock });
    await dbService.recordInventoryTransaction({
      part_id: partId,
      transaction_type: 'ISSUANCE',
      quantity: -qty,
      unit_price: target.unit_cost,
      work_order_id: woId,
      performed_by: performedBy,
      notes: `Issued ${qty} to vehicle ${vehicleId || 'workshop'}`
    });
    await refreshData();
    return true;
  };

  const receivePartStock = async (
    partId: string,
    qty: number,
    unitCost: number,
    performedBy: string = 'Storekeeper'
  ): Promise<void> => {
    const target = parts.find(p => p.id === partId);
    if (!target) return;

    const newStock = target.current_stock + qty;
    await dbService.updatePart(partId, { current_stock: newStock, unit_cost: unitCost });
    await dbService.recordInventoryTransaction({
      part_id: partId,
      transaction_type: 'PURCHASE',
      quantity: qty,
      unit_price: unitCost,
      performed_by: performedBy,
      notes: `Received ${qty} units into inventory`
    });
    await refreshData();
  };

  const adjustPartStock = async (
    partId: string,
    newStock: number,
    notes: string,
    performedBy: string = 'Storekeeper'
  ): Promise<void> => {
    const target = parts.find(p => p.id === partId);
    if (!target) return;

    const diff = newStock - target.current_stock;
    await dbService.updatePart(partId, { current_stock: newStock });
    await dbService.recordInventoryTransaction({
      part_id: partId,
      transaction_type: 'ADJUSTMENT',
      quantity: diff,
      unit_price: target.unit_cost,
      performed_by: performedBy,
      notes: notes || 'Physical stock take adjustment'
    });
    await refreshData();
  };

  // ============================================================================
  // ACTIONS: WORK ORDERS
  // ============================================================================
  const addWorkOrder = async (woData: Partial<WorkOrder>): Promise<WorkOrder> => {
    const created = await dbService.insertWorkOrder(woData);
    await dbService.insertAuditLog({
      action: 'CREATE',
      module: 'WORK_ORDERS',
      performed_by: 'Fleet Manager',
      target_id: created.work_order_number,
      details: created
    });
    await refreshData();
    return created;
  };

  const updateWorkOrderStatus = async (
    id: string,
    toStatus: WOStatus,
    notes?: string,
    changedBy: string = 'Fleet Operations'
  ): Promise<void> => {
    await dbService.updateWorkOrderStatus(id, toStatus, notes, changedBy);
    await dbService.insertAuditLog({
      action: 'STATUS_CHANGE',
      module: 'WORK_ORDERS',
      performed_by: changedBy,
      target_id: id,
      details: { to_status: toStatus, notes }
    });
    await refreshData();
  };

  const addWorkOrderPart = async (
    woId: string,
    partId: string,
    qty: number,
    _issuedBy?: string
  ): Promise<void> => {
    const part = parts.find(p => p.id === partId);
    const unitPrice = part ? part.unit_cost : 0;
    await dbService.addWorkOrderPartToDb({
      work_order_id: woId,
      part_id: partId,
      quantity: qty,
      unit_price: unitPrice
    });
    await refreshData();
  };

  const addWorkOrderLabor = async (
    woId: string,
    techId: string,
    hours: number,
    description: string = 'Repair labor'
  ): Promise<void> => {
    const tech = technicians.find(t => t.id === techId);
    const rate = tech ? tech.hourly_rate : 45.00;
    await dbService.addWorkOrderLaborToDb({
      work_order_id: woId,
      technician_id: techId,
      hours_worked: hours,
      hourly_rate: rate,
      task_description: description
    });
    await refreshData();
  };

  // ============================================================================
  // ACTIONS: INSPECTIONS & DEFECT REPORTS
  // ============================================================================
  const submitInspection = async (
    inspection: Omit<VehicleInspection, 'id' | 'inspection_number' | 'created_at'>
  ): Promise<VehicleInspection> => {
    const created = await dbService.insertVehicleInspection(inspection);
    await dbService.insertAuditLog({
      action: 'INSPECTION_SUBMITTED',
      module: 'INSPECTIONS',
      performed_by: 'Inspector',
      target_id: created.inspection_number,
      details: created
    });
    await refreshData();
    return created;
  };

  const submitDefectReport = async (
    report: Omit<DefectReport, 'id' | 'report_number' | 'created_at'>
  ): Promise<void> => {
    const reportNum = `DEF-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const payload = {
      report_number: reportNum,
      ...report,
      created_at: new Date().toISOString()
    };
    await supabase.from('defect_reports').insert([payload]);
    await dbService.insertAuditLog({
      action: 'CREATE',
      module: 'DEFECT_REPORTS',
      performed_by: report.driver_name,
      target_id: reportNum,
      details: payload
    });
    await refreshData();
  };

  const submitPublicDriverReport = async (input: {
    driver_name: string;
    plate_number: string;
    category: DefectReportCategory;
    description: string;
    photo_url?: string;
    website_url?: string;
  }): Promise<{
    success: boolean;
    report_number?: string;
    submitted_at?: string;
    vehicle_id?: string;
    plate_number?: string;
    error?: string;
  }> => {
    if (input.website_url && input.website_url.trim() !== '') {
      return { success: true, report_number: 'DEF-2026-00000', submitted_at: new Date().toISOString() };
    }

    const cleanDriverName = (input.driver_name || '').trim();
    const cleanPlate = (input.plate_number || '').trim().toUpperCase();
    const cleanDescription = (input.description || '').trim();
    const category = input.category || 'Other';

    if (cleanDriverName.length < 2) return { success: false, error: 'Full name required (min 2 chars).' };
    if (cleanPlate.length < 2) return { success: false, error: 'Valid plate number required.' };
    if (cleanDescription.length < 5) return { success: false, error: 'Issue description required (min 5 chars).' };

    const matchedVeh = vehicles.find(v => v.plate_number.toUpperCase() === cleanPlate || v.vehicle_id.toUpperCase() === cleanPlate);
    const resolvedVehicleCode = matchedVeh ? matchedVeh.vehicle_id : cleanPlate;
    const resolvedPlate = matchedVeh ? matchedVeh.plate_number : cleanPlate;

    let reportNumber = `DEF-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const nowIso = new Date().toISOString();

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('submit_public_driver_report', {
        p_driver_name: cleanDriverName,
        p_plate_number: resolvedPlate,
        p_category: category,
        p_description: cleanDescription,
        p_photo_url: input.photo_url || null,
      });

      if (!rpcError && rpcData?.report_number) {
        reportNumber = rpcData.report_number;
      } else {
        await supabase.from('defect_reports').insert([{
          report_number: reportNumber,
          driver_name: cleanDriverName,
          vehicle_id: resolvedVehicleCode,
          plate_number: resolvedPlate,
          category,
          severity: category === 'Accident' ? 'CRITICAL' : category === 'Mechanical' ? 'HIGH' : 'MEDIUM',
          description: cleanDescription,
          photo_url: input.photo_url || null,
          status: 'NEW',
          created_at: nowIso
        }]);
      }
    } catch (e: any) {
      console.error('[PublicReport] Supabase insert failed:', e);
      return { success: false, error: e.message || 'Failed to submit report to database.' };
    }

    await dbService.insertAuditLog({
      action: 'PUBLIC_DRIVER_REPORT',
      module: 'DEFECT_REPORTS',
      performed_by: `${cleanDriverName} (Driver)`,
      target_id: reportNumber,
      details: { plate: resolvedPlate, category }
    });

    await refreshData();

    return {
      success: true,
      report_number: reportNumber,
      submitted_at: nowIso,
      vehicle_id: resolvedVehicleCode,
      plate_number: resolvedPlate
    };
  };

  const updateDefectReport = async (
    id: string,
    updates: Partial<DefectReport>,
    updatedBy: string = 'Fleet Manager'
  ): Promise<boolean> => {
    try {
      await dbService.updateDefectReportInDb(id, updates);
      await dbService.insertAuditLog({
        action: 'UPDATE_DEFECT_REPORT',
        module: 'DEFECT_REPORTS',
        performed_by: updatedBy,
        target_id: id,
        details: updates
      });
      await refreshData();
      return true;
    } catch (err) {
      console.error('[FleetContext] Update defect report failed:', err);
      return false;
    }
  };

  // ============================================================================
  // ACTIONS: PREVENTIVE MAINTENANCE
  // ============================================================================
  const addMaintenanceSchedule = async (
    schedule: Omit<MaintenanceSchedule, 'id' | 'created_at'>
  ): Promise<MaintenanceSchedule> => {
    const created = await dbService.insertMaintenanceSchedule(schedule);
    await dbService.insertAuditLog({
      action: 'CREATE',
      module: 'PREVENTIVE_MAINTENANCE',
      performed_by: 'Staff',
      target_id: created.title,
      details: created
    });
    await refreshData();
    return created;
  };

  const updateMaintenanceScheduleStatus = async (
    id: string,
    status: PMStatus,
    notes?: string,
    changedBy: string = 'Fleet Manager'
  ): Promise<boolean> => {
    await dbService.updateMaintenanceScheduleStatus(id, status, notes);
    await dbService.insertAuditLog({
      action: 'STATUS_CHANGE',
      module: 'PREVENTIVE_MAINTENANCE',
      performed_by: changedBy,
      target_id: id,
      details: { status, notes }
    });
    await refreshData();
    return true;
  };

  const updateMaintenanceSchedule = async (
    id: string,
    updates: Partial<MaintenanceSchedule>,
    changedBy: string = 'Fleet Manager'
  ): Promise<boolean> => {
    if (updates.status) {
      return updateMaintenanceScheduleStatus(id, updates.status, updates.notes, changedBy);
    }
    await refreshData();
    return true;
  };

  // ============================================================================
  // ACTIONS: DOCUMENTS
  // ============================================================================
  const addDocument = async (
    doc: Omit<VehicleDocument, 'id' | 'created_at'>,
    addedBy: string = 'Compliance Staff'
  ): Promise<VehicleDocument> => {
    const created = await dbService.insertVehicleDocument(doc);
    await dbService.insertAuditLog({
      action: 'CREATE',
      module: 'DOCUMENTS',
      performed_by: addedBy,
      target_id: created.document_number,
      details: created
    });
    await refreshData();
    return created;
  };

  const updateDocument = async (
    id: string,
    updates: Partial<VehicleDocument>,
    changedBy: string = 'Compliance Staff'
  ): Promise<boolean> => {
    const updated = await dbService.updateVehicleDocument(id, updates);
    await dbService.insertAuditLog({
      action: 'UPDATE',
      module: 'DOCUMENTS',
      performed_by: changedBy,
      target_id: updated.document_number,
      details: updates
    });
    await refreshData();
    return true;
  };

  const deleteDocument = async (id: string, changedBy: string = 'Compliance Staff'): Promise<boolean> => {
    await dbService.deleteVehicleDocument(id);
    await dbService.insertAuditLog({
      action: 'DELETE',
      module: 'DOCUMENTS',
      performed_by: changedBy,
      target_id: id
    });
    await refreshData();
    return true;
  };

  const markNotificationRead = async (id: string): Promise<void> => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  // ============================================================================
  // ACTIONS: TELEMATICS & TRIPS
  // ============================================================================
  const addGpsDevice = async (device: Omit<GpsDevice, 'id' | 'created_at'>): Promise<GpsDevice> => {
    const { data, error } = await supabase.from('gps_devices').insert([device]).select().single();
    if (error) throw error;
    await refreshData();
    return data as GpsDevice;
  };

  const updateGpsDevice = async (id: string, updates: Partial<GpsDevice>): Promise<void> => {
    await supabase.from('gps_devices').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    await refreshData();
  };

  const deleteGpsDevice = async (id: string): Promise<void> => {
    await supabase.from('gps_devices').delete().eq('id', id);
    await refreshData();
  };

  const addTrip = async (trip: Omit<Trip, 'id' | 'trip_number' | 'created_at'>): Promise<Trip> => {
    const created = await dbService.insertTrip(trip);
    await refreshData();
    return created;
  };

  const updateTrip = async (id: string, updates: Partial<Trip>): Promise<void> => {
    await supabase.from('trips').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    await refreshData();
  };

  const addFuelTransaction = async (
    tx: Omit<FuelTransaction, 'id' | 'transaction_number' | 'created_at'>
  ): Promise<FuelTransaction> => {
    const autoNum = `FUEL-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const { data, error } = await supabase.from('fuel_transactions').insert([{ ...tx, transaction_number: autoNum }]).select().single();
    if (error) throw error;
    await refreshData();
    return data as FuelTransaction;
  };

  const reconcileTripFuel = (_tripId: string): TripFuelReconciliation | null => {
    return null;
  };

  const simulateGpsSync = (): void => {
    console.log('[Telematics] Manual GPS Sync trigger');
    refreshData();
  };

  return (
    <FleetContext.Provider
      value={{
        vehicles,
        trailers,
        drivers,
        technicians,
        workOrders,
        parts,
        schedules,
        inspections,
        documents,
        notifications,
        auditLogs,
        defectReports,
        trips,
        gpsDevices,
        gpsPings,
        fuelTransactions,
        fuelBenchmarks,
        tripReconciliations,
        gpsSyncLogs,
        isGpsProviderConnected: true,
        isLoadingData,
        databaseError,
        dateFilter,
        setDateFilter,
        customDateRange,
        setCustomDateRange,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        addTrailer,
        updateTrailer,
        deleteTrailer,
        addDriver,
        updateDriver,
        deleteDriver,
        addPart,
        updatePart,
        deletePart,
        addWorkOrder,
        updateWorkOrderStatus,
        addWorkOrderPart,
        addWorkOrderLabor,
        issuePartStock,
        receivePartStock,
        adjustPartStock,
        submitInspection,
        submitDefectReport,
        submitPublicDriverReport,
        updateDefectReport,
        addMaintenanceSchedule,
        updateMaintenanceScheduleStatus,
        updateMaintenanceSchedule,
        addDocument,
        updateDocument,
        deleteDocument,
        markNotificationRead,
        addGpsDevice,
        updateGpsDevice,
        deleteGpsDevice,
        addTrip,
        updateTrip,
        addFuelTransaction,
        reconcileTripFuel,
        simulateGpsSync,
        refreshData
      }}
    >
      {children}
    </FleetContext.Provider>
  );
};

export const useFleet = () => {
  const context = useContext(FleetContext);
  if (!context) {
    throw new Error('useFleet must be used within a FleetProvider');
  }
  return context;
};
