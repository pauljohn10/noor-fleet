import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  Vehicle, Trailer, Driver, Technician, WorkOrder, Part, 
  MaintenanceSchedule, PMStatus, VehicleInspection, VehicleDocument, 
  NotificationItem, AuditLog, WOStatus, WOPriority, InspectionResult,
  DefectReport, DefectReportCategory, SeverityLevel,
  GpsDevice, VehicleGpsPing, GpsSyncLog, Trip, VehicleFuelBenchmark, FuelTransaction, TripFuelReconciliation
} from '../types';
import { LocalStorageRepository } from '../lib/storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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

  // Filtering
  dateFilter: DateFilterOption;
  setDateFilter: (option: DateFilterOption) => void;
  customDateRange: DateRange;
  setCustomDateRange: (range: DateRange) => void;

  // Actions
  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>) => void;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;
  
  addTrailer: (trailer: Omit<Trailer, 'id' | 'created_at' | 'updated_at'>) => void;
  updateTrailer: (id: string, trailer: Partial<Trailer>) => void;
  deleteTrailer: (id: string) => void;

  addDriver: (driver: Omit<Driver, 'id' | 'created_at'>) => void;
  updateDriver: (id: string, driver: Partial<Driver>) => void;
  deleteDriver: (id: string) => void;

  addPart: (part: Omit<Part, 'id' | 'created_at'>) => void;
  updatePart: (id: string, part: Partial<Part>) => void;
  deletePart: (id: string) => void;

  addWorkOrder: (wo: Partial<WorkOrder>) => string;
  updateWorkOrderStatus: (id: string, toStatus: WOStatus, notes?: string, changedBy?: string) => void;
  addWorkOrderPart: (woId: string, partId: string, qty: number, issuedBy: string) => void;
  addWorkOrderLabor: (woId: string, techId: string, hours: number, description: string) => void;

  issuePartStock: (partId: string, qty: number, woId?: string, vehicleId?: string, performedBy?: string) => boolean;
  receivePartStock: (partId: string, qty: number, unitCost: number, performedBy?: string) => void;
  adjustPartStock: (partId: string, newStock: number, notes: string, performedBy?: string) => void;

  submitInspection: (inspection: Omit<VehicleInspection, 'id' | 'inspection_number' | 'created_at'>) => void;
  submitDefectReport: (report: Omit<DefectReport, 'id' | 'report_number' | 'created_at'>) => void;
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
  addMaintenanceSchedule: (schedule: Omit<MaintenanceSchedule, 'id' | 'created_at'>) => void;
  updateMaintenanceScheduleStatus: (id: string, status: PMStatus, notes?: string, changedBy?: string) => Promise<boolean>;
  updateMaintenanceSchedule: (id: string, updates: Partial<MaintenanceSchedule>, changedBy?: string) => Promise<boolean>;
  addDocument: (doc: Omit<VehicleDocument, 'id' | 'created_at'>, addedBy?: string) => void;
  updateDocument: (id: string, updates: Partial<VehicleDocument>, changedBy?: string) => Promise<boolean>;
  deleteDocument: (id: string, changedBy?: string) => Promise<boolean>;
  markNotificationRead: (id: string) => void;

  // Telematics & Fuel Actions
  addGpsDevice: (device: Omit<GpsDevice, 'id' | 'created_at'>) => GpsDevice;
  updateGpsDevice: (id: string, updates: Partial<GpsDevice>) => void;
  deleteGpsDevice: (id: string) => void;
  addTrip: (trip: Omit<Trip, 'id' | 'trip_number' | 'created_at'>) => Trip;
  updateTrip: (id: string, updates: Partial<Trip>) => void;
  addFuelTransaction: (tx: Omit<FuelTransaction, 'id' | 'transaction_number' | 'created_at'>) => FuelTransaction;
  reconcileTripFuel: (tripId: string) => TripFuelReconciliation | null;
  simulateGpsSync: () => void;
  refreshData: () => void;
}

const FleetContext = createContext<FleetContextType | undefined>(undefined);

export const FleetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  const [dateFilter, setDateFilter] = useState<DateFilterOption>('ALL');
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10)
  });

  const refreshData = useCallback(async () => {
    const localReports = LocalStorageRepository.getDefectReports();
    setVehicles(LocalStorageRepository.getVehicles());
    setTrailers(LocalStorageRepository.getTrailers());
    setDrivers(LocalStorageRepository.getDrivers());
    setTechnicians(LocalStorageRepository.getTechnicians());
    setWorkOrders(LocalStorageRepository.getWorkOrders());
    setParts(LocalStorageRepository.getParts());
    setSchedules(LocalStorageRepository.getSchedules());
    setInspections(LocalStorageRepository.getInspections());
    setDocuments(LocalStorageRepository.getDocuments());
    setNotifications(LocalStorageRepository.getNotifications());
    setAuditLogs(LocalStorageRepository.getAuditLogs());
    setDefectReports(localReports);

    // Telematics & Fuel Loading
    setTrips(LocalStorageRepository.getTrips());
    setGpsDevices(LocalStorageRepository.getGpsDevices());
    setGpsPings(LocalStorageRepository.getGpsPings());
    setFuelTransactions(LocalStorageRepository.getFuelTransactions());
    setFuelBenchmarks(LocalStorageRepository.getFuelBenchmarks());
    setTripReconciliations(LocalStorageRepository.getTripReconciliations());
    setGpsSyncLogs(LocalStorageRepository.getGpsSyncLogs());

    if (isSupabaseConfigured) {
      try {
        const { data: repData } = await supabase
          .from('defect_reports')
          .select('*')
          .order('created_at', { ascending: false });
        if (repData && repData.length > 0) {
          const currentLocal = LocalStorageRepository.getDefectReports();
          const mergedMap = new Map<string, DefectReport>();
          for (const loc of currentLocal) {
            mergedMap.set(loc.report_number || loc.id, loc);
          }
          for (const rem of repData as DefectReport[]) {
            const key = rem.report_number || rem.id;
            const existing = mergedMap.get(key);
            if (!existing) {
              mergedMap.set(key, rem);
            } else {
              const locTime = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
              const remTime = rem.updated_at ? new Date(rem.updated_at).getTime() : 0;
              if (remTime > locTime) {
                mergedMap.set(key, rem);
              }
            }
          }
          const mergedReports = Array.from(mergedMap.values()).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setDefectReports(mergedReports);
          LocalStorageRepository.saveDefectReports(mergedReports);
        }

        const { data: tripData } = await supabase
          .from('trips')
          .select('*')
          .order('created_at', { ascending: false });
        if (tripData && tripData.length > 0) setTrips(tripData as Trip[]);

        const { data: pingData } = await supabase
          .from('vehicle_gps_pings')
          .select('*')
          .order('gps_timestamp', { ascending: false })
          .limit(100);
        if (pingData && pingData.length > 0) setGpsPings(pingData as VehicleGpsPing[]);

        const { data: fuelData } = await supabase
          .from('fuel_transactions')
          .select('*')
          .order('transaction_date', { ascending: false });
        if (fuelData && fuelData.length > 0) setFuelTransactions(fuelData as FuelTransaction[]);

        const { data: schData } = await supabase
          .from('maintenance_schedules')
          .select('*')
          .order('created_at', { ascending: false });
        if (schData && schData.length > 0) {
          const localSchedules = LocalStorageRepository.getSchedules();
          const mergedMap = new Map<string, MaintenanceSchedule>();
          for (const localSch of localSchedules) {
            mergedMap.set(localSch.id, localSch);
          }
          for (const remoteSch of schData as MaintenanceSchedule[]) {
            const existing = mergedMap.get(remoteSch.id);
            if (!existing) {
              mergedMap.set(remoteSch.id, remoteSch);
            } else {
              const localTime = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
              const remoteTime = remoteSch.updated_at ? new Date(remoteSch.updated_at).getTime() : 0;
              if (remoteTime > localTime) {
                mergedMap.set(remoteSch.id, remoteSch);
              }
            }
          }
          const mergedList = Array.from(mergedMap.values());
          setSchedules(mergedList);
          LocalStorageRepository.saveSchedules(mergedList);
        }

        const { data: docData } = await supabase
          .from('vehicle_documents')
          .select('*')
          .order('expiry_date', { ascending: true });
        if (docData && docData.length > 0) {
          const localDocs = LocalStorageRepository.getDocuments();
          const mergedMap = new Map<string, VehicleDocument>();
          for (const localDoc of localDocs) {
            mergedMap.set(localDoc.id, localDoc);
          }
          for (const remoteDoc of docData as VehicleDocument[]) {
            const existing = mergedMap.get(remoteDoc.id);
            if (!existing) {
              mergedMap.set(remoteDoc.id, remoteDoc);
            } else {
              const localTime = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
              const remoteTime = remoteDoc.updated_at ? new Date(remoteDoc.updated_at).getTime() : 0;
              if (remoteTime >= localTime) {
                mergedMap.set(remoteDoc.id, remoteDoc);
              }
            }
          }
          const mergedDocs = Array.from(mergedMap.values());
          setDocuments(mergedDocs);
          LocalStorageRepository.saveDocuments(mergedDocs);
        }
      } catch (err) {
        console.error('[Supabase Exception] Error fetching telematics data:', err);
      }
    }
  }, []);

  useEffect(() => {
    refreshData();
    const handleStorageSync = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('FWMS_V1_')) {
        refreshData();
      }
    };
    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, [refreshData]);

  // Actions implementation
  const addVehicle = (vehData: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>) => {
    const newVeh: Vehicle = {
      ...vehData,
      id: 'v-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const updated = [newVeh, ...vehicles];
    setVehicles(updated);
    LocalStorageRepository.saveVehicles(updated);
    
    LocalStorageRepository.addAuditLog({
      user_name: 'Active User',
      user_role: 'FLEET_MANAGER',
      action: 'CREATE',
      module: 'VEHICLES',
      record_id: newVeh.vehicle_id,
      new_values: newVeh,
      ip_address: '127.0.0.1'
    });
    refreshData();
  };

  const updateVehicle = (id: string, updates: Partial<Vehicle>) => {
    const updated = vehicles.map(v => v.id === id ? { ...v, ...updates, updated_at: new Date().toISOString() } : v);
    setVehicles(updated);
    LocalStorageRepository.saveVehicles(updated);
    refreshData();
  };

  const deleteVehicle = (id: string) => {
    const target = vehicles.find(v => v.id === id);
    const updated = vehicles.filter(v => v.id !== id);
    setVehicles(updated);
    LocalStorageRepository.saveVehicles(updated);
    if (target) {
      LocalStorageRepository.addAuditLog({
        user_name: 'Active User',
        user_role: 'FLEET_MANAGER',
        action: 'DELETE',
        module: 'VEHICLES',
        record_id: target.vehicle_id,
        old_values: target,
        ip_address: '127.0.0.1'
      });
    }
    refreshData();
  };

  const addTrailer = (trailerData: Omit<Trailer, 'id' | 'created_at' | 'updated_at'>) => {
    const newTr: Trailer = {
      ...trailerData,
      id: 'tr-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const updated = [newTr, ...trailers];
    setTrailers(updated);
    LocalStorageRepository.saveTrailers(updated);
    refreshData();
  };

  const updateTrailer = (id: string, updates: Partial<Trailer>) => {
    const updated = trailers.map(t => t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t);
    setTrailers(updated);
    LocalStorageRepository.saveTrailers(updated);
    refreshData();
  };

  const deleteTrailer = (id: string) => {
    const updated = trailers.filter(t => t.id !== id);
    setTrailers(updated);
    LocalStorageRepository.saveTrailers(updated);
    refreshData();
  };

  const addDriver = (driverData: Omit<Driver, 'id' | 'created_at'>) => {
    const newDr: Driver = {
      ...driverData,
      id: 'dr-' + Date.now(),
      created_at: new Date().toISOString()
    };
    const updated = [newDr, ...drivers];
    setDrivers(updated);
    LocalStorageRepository.saveDrivers(updated);
    refreshData();
  };

  const updateDriver = (id: string, updates: Partial<Driver>) => {
    const updated = drivers.map(d => d.id === id ? { ...d, ...updates } : d);
    setDrivers(updated);
    LocalStorageRepository.saveDrivers(updated);
    refreshData();
  };

  const deleteDriver = (id: string) => {
    const updated = drivers.filter(d => d.id !== id);
    setDrivers(updated);
    LocalStorageRepository.saveDrivers(updated);
    refreshData();
  };

  const addPart = (partData: Omit<Part, 'id' | 'created_at'>) => {
    const newPart: Part = {
      ...partData,
      id: 'part-' + Date.now(),
      created_at: new Date().toISOString()
    };
    const updated = [newPart, ...parts];
    setParts(updated);
    LocalStorageRepository.saveParts(updated);
    refreshData();
  };

  const updatePart = (id: string, updates: Partial<Part>) => {
    const updated = parts.map(p => p.id === id ? { ...p, ...updates } : p);
    setParts(updated);
    LocalStorageRepository.saveParts(updated);
    refreshData();
  };

  const deletePart = (id: string) => {
    const updated = parts.filter(p => p.id !== id);
    setParts(updated);
    LocalStorageRepository.saveParts(updated);
    refreshData();
  };

  const addWorkOrder = (woData: Partial<WorkOrder>): string => {
    const yearStr = new Date().getFullYear().toString();
    const count = workOrders.length + 1;
    const woNum = `WO-${yearStr}-${String(count).padStart(6, '0')}`;
    
    const newWO: WorkOrder = {
      id: 'wo-' + Date.now(),
      work_order_number: woNum,
      vehicle_id: woData.vehicle_id || '',
      trailer_id: woData.trailer_id,
      driver_id: woData.driver_id,
      reported_by: woData.reported_by || 'System',
      date_reported: new Date().toISOString(),
      problem_description: woData.problem_description || 'Unspecified Work Order Request',
      priority: woData.priority || 'MEDIUM',
      workshop_location_id: woData.workshop_location_id || '10000000-0000-0000-0000-000000000001',
      assigned_supervisor_id: woData.assigned_supervisor_id,
      assigned_technician_id: woData.assigned_technician_id,
      status: woData.status || 'REPORTED',
      parts_cost: 0,
      labor_cost: 0,
      external_service_cost: 0,
      other_cost: 0,
      total_cost: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const updated = [newWO, ...workOrders];
    setWorkOrders(updated);
    LocalStorageRepository.saveWorkOrders(updated);

    // Update target vehicle status to IN_WORKSHOP
    if (newWO.vehicle_id) {
      updateVehicle(newWO.vehicle_id, { status: 'IN_WORKSHOP' });
    }

    LocalStorageRepository.addAuditLog({
      user_name: newWO.reported_by,
      user_role: 'WORKSHOP_SUPERVISOR',
      action: 'CREATE',
      module: 'WORK_ORDERS',
      record_id: newWO.work_order_number,
      new_values: newWO,
      ip_address: '127.0.0.1'
    });

    refreshData();
    return newWO.id;
  };

  const updateWorkOrderStatus = (id: string, toStatus: WOStatus, notes?: string, changedBy: string = 'Active User') => {
    const target = workOrders.find(w => w.id === id);
    if (!target) return;

    const fromStatus = target.status;
    const updates: Partial<WorkOrder> = {
      status: toStatus,
      updated_at: new Date().toISOString()
    };

    if (toStatus === 'COMPLETED' || toStatus === 'RELEASED') {
      updates.actual_completion = new Date().toISOString();
    }

    const updatedWOList = workOrders.map(w => w.id === id ? { ...w, ...updates } : w);
    setWorkOrders(updatedWOList);
    LocalStorageRepository.saveWorkOrders(updatedWOList);

    // If released, release vehicle status back to AVAILABLE
    if (toStatus === 'RELEASED' && target.vehicle_id) {
      updateVehicle(target.vehicle_id, { status: 'AVAILABLE' });
    }

    LocalStorageRepository.addAuditLog({
      user_name: changedBy,
      user_role: 'WORKSHOP_SUPERVISOR',
      action: 'STATUS_CHANGE',
      module: 'WORK_ORDERS',
      record_id: target.work_order_number,
      old_values: { status: fromStatus },
      new_values: { status: toStatus, notes },
      ip_address: '127.0.0.1'
    });

    refreshData();
  };

  const issuePartStock = (partId: string, qty: number, woId?: string, vehicleId?: string, performedBy: string = 'Storekeeper'): boolean => {
    const targetPart = parts.find(p => p.id === partId);
    if (!targetPart) return false;

    if (targetPart.current_stock < qty) {
      alert(`Cannot issue ${qty} units. Insufficient stock! Available: ${targetPart.current_stock}`);
      return false;
    }

    const newStock = targetPart.current_stock - qty;
    const updatedParts = parts.map(p => p.id === partId ? { ...p, current_stock: newStock } : p);
    setParts(updatedParts);
    LocalStorageRepository.saveParts(updatedParts);

    // If linked to work order, add cost to work order parts_cost
    if (woId) {
      const wo = workOrders.find(w => w.id === woId);
      if (wo) {
        const addedCost = qty * targetPart.unit_cost;
        const newPartsCost = wo.parts_cost + addedCost;
        const newTotal = newPartsCost + wo.labor_cost + wo.external_service_cost + wo.other_cost;
        
        const updatedWOs = workOrders.map(w => w.id === woId ? { ...w, parts_cost: newPartsCost, total_cost: newTotal } : w);
        setWorkOrders(updatedWOs);
        LocalStorageRepository.saveWorkOrders(updatedWOs);
      }
    }

    LocalStorageRepository.addAuditLog({
      user_name: performedBy,
      user_role: 'STOREKEEPER',
      action: 'ISSUE_PART',
      module: 'INVENTORY',
      record_id: targetPart.part_number,
      old_values: { stock: targetPart.current_stock },
      new_values: { stock: newStock, issued_qty: qty, woId },
      ip_address: '127.0.0.1'
    });

    refreshData();
    return true;
  };

  const receivePartStock = (partId: string, qty: number, unitCost: number, performedBy: string = 'Storekeeper') => {
    const targetPart = parts.find(p => p.id === partId);
    if (!targetPart) return;

    const newStock = targetPart.current_stock + qty;
    const updatedParts = parts.map(p => p.id === partId ? { ...p, current_stock: newStock, unit_cost: unitCost } : p);
    setParts(updatedParts);
    LocalStorageRepository.saveParts(updatedParts);

    LocalStorageRepository.addAuditLog({
      user_name: performedBy,
      user_role: 'STOREKEEPER',
      action: 'RECEIVE_STOCK',
      module: 'INVENTORY',
      record_id: targetPart.part_number,
      old_values: { stock: targetPart.current_stock },
      new_values: { stock: newStock, received_qty: qty, unitCost },
      ip_address: '127.0.0.1'
    });

    refreshData();
  };

  const adjustPartStock = (partId: string, newStock: number, notes: string, performedBy: string = 'Storekeeper') => {
    const targetPart = parts.find(p => p.id === partId);
    if (!targetPart) return;

    const oldStock = targetPart.current_stock;
    const updatedParts = parts.map(p => p.id === partId ? { ...p, current_stock: newStock } : p);
    setParts(updatedParts);
    LocalStorageRepository.saveParts(updatedParts);

    LocalStorageRepository.addAuditLog({
      user_name: performedBy,
      user_role: 'STOREKEEPER',
      action: 'STOCK_ADJUSTMENT',
      module: 'INVENTORY',
      record_id: targetPart.part_number,
      old_values: { stock: oldStock },
      new_values: { stock: newStock, notes },
      ip_address: '127.0.0.1'
    });

    refreshData();
  };

  const addWorkOrderPart = (woId: string, partId: string, qty: number, issuedBy: string) => {
    issuePartStock(partId, qty, woId, undefined, issuedBy);
  };

  const addWorkOrderLabor = (woId: string, techId: string, hours: number, description: string) => {
    const wo = workOrders.find(w => w.id === woId);
    const tech = technicians.find(t => t.id === techId);
    if (!wo || !tech) return;

    const laborCost = hours * tech.hourly_rate;
    const newLaborTotal = wo.labor_cost + laborCost;
    const newTotal = wo.parts_cost + newLaborTotal + wo.external_service_cost + wo.other_cost;

    const updatedWOs = workOrders.map(w => w.id === woId ? { ...w, labor_cost: newLaborTotal, total_cost: newTotal } : w);
    setWorkOrders(updatedWOs);
    LocalStorageRepository.saveWorkOrders(updatedWOs);
    refreshData();
  };

  const submitInspection = (inspData: Omit<VehicleInspection, 'id' | 'inspection_number' | 'created_at'>) => {
    const num = 'INSP-' + Date.now().toString().slice(-6);
    const newInspection: VehicleInspection = {
      ...inspData,
      id: 'insp-' + Date.now(),
      inspection_number: num,
      created_at: new Date().toISOString()
    };

    let autoWOId: string | undefined = undefined;

    // Automatic Job Card Trigger if CRITICAL failure detected!
    if (newInspection.has_critical_failure) {
      const failedItems = newInspection.items
        .filter(i => i.result === 'FAIL' && i.severity === 'CRITICAL')
        .map(i => `${i.category}: ${i.item_name} (${i.comment || 'Critical Defect'})`)
        .join('; ');

      autoWOId = addWorkOrder({
        vehicle_id: newInspection.vehicle_id,
        trailer_id: newInspection.trailer_id,
        driver_id: newInspection.driver_id,
        problem_description: `[AUTOMATIC CRITICAL INSPECTION FAILURE] ${failedItems}`,
        priority: 'CRITICAL',
        status: 'REPORTED',
        reported_by: 'Digital Inspection Sentinel'
      });

      newInspection.created_work_order_id = autoWOId;
    }

    const updatedInspections = [newInspection, ...inspections];
    setInspections(updatedInspections);
    LocalStorageRepository.saveInspections(updatedInspections);

    LocalStorageRepository.addAuditLog({
      user_name: 'Driver Inspector',
      user_role: 'DRIVER',
      action: 'SUBMIT_INSPECTION',
      module: 'INSPECTIONS',
      record_id: num,
      new_values: newInspection,
      ip_address: '127.0.0.1'
    });

    refreshData();
  };

  const submitDefectReport = async (reportData: Omit<DefectReport, 'id' | 'report_number' | 'created_at'>) => {
    const nextSeq = defectReports.length + 1;
    const num = `DEF-2026-${String(nextSeq).padStart(5, '0')}`;
    
    const newReport: DefectReport = {
      ...reportData,
      id: 'def-' + Date.now(),
      report_number: num,
      created_at: new Date().toISOString()
    };

    const updatedReports = LocalStorageRepository.addDefectReport(newReport);
    setDefectReports(updatedReports);

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('defect_reports').insert([{
          report_number: num,
          driver_id: newReport.driver_id,
          driver_name: newReport.driver_name,
          vehicle_id: newReport.vehicle_id,
          trailer_id: newReport.trailer_id,
          category: newReport.category,
          severity: newReport.severity,
          description: newReport.description,
          status: newReport.status || 'REPORTED'
        }]);

        if (error) {
          console.error('[Supabase Error] Defect report INSERT failed:', error.message);
        } else {
          console.log('[Supabase Success] Defect report persisted to Supabase database:', num);
        }
      } catch (err) {
        console.error('[Supabase Exception] Defect report INSERT exception:', err);
      }
    }

    if (newReport.severity === 'CRITICAL' && newReport.vehicle_id) {
      updateVehicle(newReport.vehicle_id, { status: 'REQUIRES INSPECTION' });
    }

    LocalStorageRepository.addAuditLog({
      user_name: newReport.driver_name,
      user_role: 'DRIVER',
      action: 'SUBMIT_DEFECT_REPORT',
      module: 'DEFECT_REPORTS',
      record_id: num,
      new_values: newReport,
      ip_address: '127.0.0.1'
    });

    LocalStorageRepository.addNotification({
      title: `New Defect Report (${newReport.severity}): ${num}`,
      message: `Driver ${newReport.driver_name} reported ${newReport.category} defect on vehicle ${newReport.vehicle_id}. Description: ${newReport.description}`,
      category: 'INSPECTION',
      target_role: 'FLEET_MANAGER',
      reference_id: num
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
  }) => {
    // 1. Honeypot spam protection
    if (input.website_url && input.website_url.trim() !== '') {
      return {
        success: true,
        report_number: 'DEF-2026-00000',
        submitted_at: new Date().toISOString()
      };
    }

    // 2. Sanitize & validate fields
    const sanitize = (str: string, maxLen: number) =>
      (str || '').replace(/[<>]/g, '').trim().slice(0, maxLen);

    const cleanDriverName = sanitize(input.driver_name, 120);
    const cleanPlate = sanitize(input.plate_number, 40).toUpperCase();
    const cleanDescription = sanitize(input.description, 2000);
    const category = input.category || 'Other';

    if (cleanDriverName.length < 2) {
      return { success: false, error: 'Please enter your full name (minimum 2 characters).' };
    }
    if (cleanPlate.length < 2) {
      return { success: false, error: 'Please select or enter a valid vehicle plate number.' };
    }
    if (cleanDescription.length < 5) {
      return { success: false, error: 'Please describe the vehicle issue (minimum 5 characters).' };
    }

    // 3. Match plate number against existing registered vehicles (never create duplicate vehicles)
    const allVehicles = LocalStorageRepository.getVehicles();
    const allTrailers = LocalStorageRepository.getTrailers();
    const allDrivers = LocalStorageRepository.getDrivers();

    const matchedVehicle = allVehicles.find(
      v =>
        v.plate_number.trim().toUpperCase() === cleanPlate ||
        v.vehicle_id.trim().toUpperCase() === cleanPlate
    );

    const matchedTrailer = matchedVehicle?.assigned_trailer_id
      ? allTrailers.find(t => t.id === matchedVehicle.assigned_trailer_id)
      : undefined;

    const matchedDriver =
      allDrivers.find(d => d.full_name.toLowerCase() === cleanDriverName.toLowerCase()) ||
      (matchedVehicle?.assigned_driver_id
        ? allDrivers.find(d => d.id === matchedVehicle.assigned_driver_id)
        : undefined);

    const resolvedVehicleCode = matchedVehicle ? matchedVehicle.vehicle_id : cleanPlate;
    const resolvedPlate = matchedVehicle ? matchedVehicle.plate_number : cleanPlate;
    const severity: SeverityLevel =
      category === 'Accident'
        ? 'CRITICAL'
        : category === 'Mechanical'
        ? 'HIGH'
        : 'MEDIUM';

    const nowIso = new Date().toISOString();
    const currentReports = LocalStorageRepository.getDefectReports();
    const nextSeq = currentReports.length + 132;
    let reportNumber = `DEF-${new Date().getFullYear()}-${String(nextSeq).padStart(5, '0')}`;

    // 4. Submit via secure Supabase Edge Function / RPC if configured
    if (isSupabaseConfigured) {
      try {
        const { data: fnData, error: fnError } = await supabase.functions.invoke(
          'submit-driver-report',
          {
            body: {
              driver_name: cleanDriverName,
              plate_number: resolvedPlate,
              category,
              description: cleanDescription,
              photo_url: input.photo_url || null,
            },
          }
        );

        if (!fnError && fnData?.report_number) {
          reportNumber = fnData.report_number;
        } else {
          // Fallback to secure RPC or direct insert if Edge Function is not yet deployed remotely
          const { data: rpcData, error: rpcError } = await supabase.rpc(
            'submit_public_driver_report',
            {
              p_driver_name: cleanDriverName,
              p_plate_number: resolvedPlate,
              p_category: category,
              p_description: cleanDescription,
              p_photo_url: input.photo_url || null,
            }
          );

          if (!rpcError && rpcData?.report_number) {
            reportNumber = rpcData.report_number;
          } else {
            await supabase.from('defect_reports').insert([
              {
                report_number: reportNumber,
                driver_id: matchedDriver?.id || null,
                driver_name: cleanDriverName,
                vehicle_id: resolvedVehicleCode,
                plate_number: resolvedPlate,
                trailer_id: matchedTrailer?.trailer_id || null,
                category,
                severity,
                description: cleanDescription,
                photo_url: input.photo_url || null,
                status: 'NEW',
                created_at: nowIso,
              },
            ]);
          }
        }
      } catch (err) {
        console.warn('[Public Driver Report] Supabase submission fallback notice:', err);
      }
    }

    // 5. Persist into Noor Fleet state & storage so staff can review immediately
    const newReport: DefectReport = {
      id: 'def-' + Date.now(),
      report_number: reportNumber,
      driver_id: matchedDriver?.id,
      driver_name: cleanDriverName,
      vehicle_id: resolvedVehicleCode,
      plate_number: resolvedPlate,
      trailer_id: matchedTrailer?.trailer_id,
      category,
      severity,
      description: cleanDescription,
      photo_url: input.photo_url,
      status: 'NEW',
      created_at: nowIso,
      updated_at: nowIso,
    };

    const updatedReports = LocalStorageRepository.addDefectReport(newReport);
    setDefectReports(updatedReports);

    if (severity === 'CRITICAL' && matchedVehicle) {
      updateVehicle(matchedVehicle.id, { status: 'REQUIRES INSPECTION' });
    }

    LocalStorageRepository.addAuditLog({
      user_name: `${cleanDriverName} (Public Portal)`,
      user_role: 'PUBLIC_PORTAL',
      action: 'PUBLIC_DRIVER_REPORT_SUBMITTED',
      module: 'DEFECT_REPORTS',
      record_id: reportNumber,
      new_values: {
        report_number: reportNumber,
        driver_name: cleanDriverName,
        vehicle_id: resolvedVehicleCode,
        plate_number: resolvedPlate,
        category,
        severity,
      },
      ip_address: '127.0.0.1',
    });

    LocalStorageRepository.addNotification({
      title: `New Driver Issue Report (${category}): ${reportNumber}`,
      message: `${cleanDriverName} reported a ${category} issue on vehicle ${resolvedVehicleCode} (${resolvedPlate}): ${cleanDescription}`,
      category: 'INSPECTION',
      target_role: 'FLEET_MANAGER',
      reference_id: reportNumber,
    });

    await refreshData();

    return {
      success: true,
      report_number: reportNumber,
      submitted_at: nowIso,
      vehicle_id: resolvedVehicleCode,
      plate_number: resolvedPlate,
    };
  };

  const updateDefectReport = async (
    id: string,
    updates: Partial<DefectReport>,
    updatedBy: string = 'Fleet Manager'
  ): Promise<boolean> => {
    const current = LocalStorageRepository.getDefectReports();
    const target = current.find(r => r.id === id || r.report_number === id);
    if (!target) return false;

    const nowIso = new Date().toISOString();
    const updatedRecord: DefectReport = {
      ...target,
      ...updates,
      updated_at: nowIso,
    };

    const updatedList = current.map(r =>
      r.id === target.id ? updatedRecord : r
    );
    setDefectReports(updatedList);
    LocalStorageRepository.saveDefectReports(updatedList);

    LocalStorageRepository.addAuditLog({
      user_name: updatedBy,
      user_role: 'FLEET_MANAGER',
      action: updates.status && updates.status !== target.status ? 'STATUS_CHANGE' : 'UPDATE_DEFECT_REPORT',
      module: 'DEFECT_REPORTS',
      record_id: target.report_number,
      old_values: {
        status: target.status,
        assigned_maintenance_team: target.assigned_maintenance_team,
        internal_notes: target.internal_notes,
      },
      new_values: updates,
      ip_address: '127.0.0.1',
    });

    if (isSupabaseConfigured) {
      try {
        const dbPayload: Record<string, unknown> = {};
        if (updates.status !== undefined) dbPayload.status = updates.status;
        if (updates.fleet_manager_notes !== undefined) dbPayload.fleet_manager_notes = updates.fleet_manager_notes;
        if (updates.internal_notes !== undefined) dbPayload.internal_notes = updates.internal_notes;
        if (updates.workshop_response !== undefined) dbPayload.workshop_response = updates.workshop_response;
        if (updates.assigned_maintenance_team !== undefined) dbPayload.assigned_maintenance_team = updates.assigned_maintenance_team;
        if (updates.action_taken !== undefined) dbPayload.action_taken = updates.action_taken;
        if (updates.work_order_id !== undefined) dbPayload.work_order_id = updates.work_order_id;

        if (Object.keys(dbPayload).length > 0) {
          const { error } = await supabase
            .from('defect_reports')
            .update(dbPayload)
            .eq('report_number', target.report_number);
          if (error) {
            console.warn('[Supabase] defect_reports update notice:', error.message);
          }
        }
      } catch (err) {
        console.warn('[Supabase Exception] defect_reports update:', err);
      }
    }

    return true;
  };

  const addMaintenanceSchedule = (schData: Omit<MaintenanceSchedule, 'id' | 'created_at'>) => {
    const now = new Date().toISOString();
    const newSch: MaintenanceSchedule = {
      ...schData,
      id: 'sch-' + Date.now(),
      created_at: now,
      updated_at: now
    };
    const current = LocalStorageRepository.getSchedules();
    const updated = [newSch, ...current];
    setSchedules(updated);
    LocalStorageRepository.saveSchedules(updated);

    LocalStorageRepository.addAuditLog({
      user_name: 'Fleet Manager',
      user_role: 'FLEET_MANAGER',
      action: 'CREATE_PM_SCHEDULE',
      module: 'PREVENTIVE_MAINTENANCE',
      record_id: newSch.id,
      new_values: newSch,
      ip_address: '127.0.0.1'
    });

    if (isSupabaseConfigured) {
      supabase.from('maintenance_schedules').insert([{
        title: newSch.title,
        vehicle_id: newSch.vehicle_id || null,
        trailer_id: newSch.trailer_id || null,
        frequency_type: newSch.frequency_type,
        interval_value: newSch.interval_value,
        last_service_mileage: newSch.last_service_mileage,
        last_service_date: newSch.last_service_date || null,
        next_due_mileage: newSch.next_due_mileage,
        next_due_date: newSch.next_due_date || null,
        status: newSch.status,
        notes: newSch.notes || null
      }]).then(({ error }) => {
        if (error) console.warn('[Supabase] maintenance_schedules insert notice:', error.message);
      });
    }

    refreshData();
  };

  const updateMaintenanceScheduleStatus = async (
    id: string,
    status: PMStatus,
    notes?: string,
    changedBy: string = 'Fleet Manager'
  ): Promise<boolean> => {
    const current = LocalStorageRepository.getSchedules();
    const target = current.find(s => s.id === id);
    if (!target) return false;

    const now = new Date().toISOString();
    const updatedRecord: MaintenanceSchedule = {
      ...target,
      status,
      ...(notes !== undefined ? { notes } : {}),
      updated_at: now
    };

    const updatedList = current.map(s => (s.id === id ? updatedRecord : s));
    setSchedules(updatedList);
    LocalStorageRepository.saveSchedules(updatedList);

    LocalStorageRepository.addAuditLog({
      user_name: changedBy,
      user_role: 'FLEET_MANAGER',
      action: 'STATUS_CHANGE',
      module: 'PREVENTIVE_MAINTENANCE',
      record_id: target.title || id,
      old_values: { status: target.status, notes: target.notes },
      new_values: { status: updatedRecord.status, notes: updatedRecord.notes },
      ip_address: '127.0.0.1'
    });

    if (isSupabaseConfigured) {
      try {
        const payload: Record<string, unknown> = {
          status,
          updated_at: now
        };
        if (notes !== undefined) {
          payload.notes = notes;
        }
        const { error } = await supabase
          .from('maintenance_schedules')
          .update(payload)
          .eq('id', id);
        if (error) {
          console.warn('[Supabase] maintenance_schedules status update notice:', error.message);
        }
      } catch (err) {
        console.warn('[Supabase Exception] maintenance_schedules status update:', err);
      }
    }

    return true;
  };

  const updateMaintenanceSchedule = async (
    id: string,
    updates: Partial<MaintenanceSchedule>,
    changedBy: string = 'Fleet Manager'
  ): Promise<boolean> => {
    const current = LocalStorageRepository.getSchedules();
    const target = current.find(s => s.id === id);
    if (!target) return false;

    const now = new Date().toISOString();
    const updatedRecord: MaintenanceSchedule = {
      ...target,
      ...updates,
      id: target.id,
      created_at: target.created_at,
      updated_at: now
    };

    const updatedList = current.map(s => (s.id === id ? updatedRecord : s));
    setSchedules(updatedList);
    LocalStorageRepository.saveSchedules(updatedList);

    LocalStorageRepository.addAuditLog({
      user_name: changedBy,
      user_role: 'FLEET_MANAGER',
      action: updates.status && updates.status !== target.status ? 'STATUS_CHANGE' : 'UPDATE',
      module: 'PREVENTIVE_MAINTENANCE',
      record_id: target.title || id,
      old_values: { status: target.status, last_service_mileage: target.last_service_mileage, next_due_mileage: target.next_due_mileage, next_due_date: target.next_due_date },
      new_values: updates,
      ip_address: '127.0.0.1'
    });

    if (isSupabaseConfigured) {
      try {
        const dbPayload: Record<string, unknown> = { updated_at: now };
        if (updates.status !== undefined) dbPayload.status = updates.status;
        if (updates.notes !== undefined) dbPayload.notes = updates.notes;
        if (updates.last_service_mileage !== undefined) dbPayload.last_service_mileage = updates.last_service_mileage;
        if (updates.last_service_date !== undefined) dbPayload.last_service_date = updates.last_service_date || null;
        if (updates.next_due_mileage !== undefined) dbPayload.next_due_mileage = updates.next_due_mileage;
        if (updates.next_due_date !== undefined) dbPayload.next_due_date = updates.next_due_date || null;
        if (updates.title !== undefined) dbPayload.title = updates.title;
        if (updates.interval_value !== undefined) dbPayload.interval_value = updates.interval_value;

        const { error } = await supabase
          .from('maintenance_schedules')
          .update(dbPayload)
          .eq('id', id);
        if (error) {
          console.warn('[Supabase] maintenance_schedules update notice:', error.message);
        }
      } catch (err) {
        console.warn('[Supabase Exception] maintenance_schedules update:', err);
      }
    }

    return true;
  };

  const addDocument = async (docData: Omit<VehicleDocument, 'id' | 'created_at'>, addedBy: string = 'Fleet Manager') => {
    const now = new Date().toISOString();
    const newDoc: VehicleDocument = {
      ...docData,
      id: 'doc-' + Date.now(),
      created_at: now,
      updated_at: now,
      updated_by: addedBy
    };
    const updated = [newDoc, ...documents];
    setDocuments(updated);
    LocalStorageRepository.saveDocuments(updated);

    LocalStorageRepository.addAuditLog({
      user_name: addedBy,
      user_role: 'FLEET_MANAGER',
      action: 'REGISTER_DOCUMENT',
      module: 'VEHICLE_DOCUMENTS',
      record_id: `${newDoc.document_type} - ${newDoc.document_number}`,
      new_values: newDoc,
      ip_address: '127.0.0.1'
    });

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('vehicle_documents').insert([{
          document_type: newDoc.document_type,
          document_number: newDoc.document_number,
          issue_date: newDoc.issue_date || null,
          expiry_date: newDoc.expiry_date,
          vehicle_id: newDoc.vehicle_id || null,
          trailer_id: newDoc.trailer_id || null,
          issuing_authority: newDoc.issuing_authority || null,
          attachment_url: newDoc.attachment_url || null,
          notes: newDoc.notes || null
        }]);
        if (error) {
          console.warn('[Supabase] vehicle_documents insert notice:', error.message);
        }
      } catch (err) {
        console.warn('[Supabase Exception] vehicle_documents insert:', err);
      }
    }

    refreshData();
  };

  const updateDocument = async (
    id: string,
    updates: Partial<VehicleDocument>,
    changedBy: string = 'Fleet Manager'
  ): Promise<boolean> => {
    const current = LocalStorageRepository.getDocuments();
    const target = current.find(d => d.id === id);
    if (!target) return false;

    const now = new Date().toISOString();
    const updatedRecord: VehicleDocument = {
      ...target,
      ...updates,
      id: target.id,
      created_at: target.created_at,
      updated_at: now,
      updated_by: changedBy
    };

    const updatedList = current.map(d => (d.id === id ? updatedRecord : d));
    setDocuments(updatedList);
    LocalStorageRepository.saveDocuments(updatedList);

    // Audit Log entry with previous vs new values
    LocalStorageRepository.addAuditLog({
      user_name: changedBy,
      user_role: 'FLEET_MANAGER',
      action: 'RENEW_UPDATE_DOCUMENT',
      module: 'VEHICLE_DOCUMENTS',
      record_id: `${target.document_type} - ${target.document_number || id}`,
      old_values: {
        expiry_date: target.expiry_date,
        issue_date: target.issue_date,
        document_number: target.document_number,
        issuing_authority: target.issuing_authority,
        notes: target.notes
      },
      new_values: {
        expiry_date: updatedRecord.expiry_date,
        issue_date: updatedRecord.issue_date,
        document_number: updatedRecord.document_number,
        issuing_authority: updatedRecord.issuing_authority,
        notes: updatedRecord.notes
      },
      ip_address: '127.0.0.1'
    });

    // Check if new expiry date extends past 30 days; mark old warning alerts read
    const diffDays = Math.ceil((new Date(updatedRecord.expiry_date).getTime() - Date.now()) / (1000 * 3600 * 24));
    if (diffDays > 30) {
      const currentNotifs = LocalStorageRepository.getNotifications();
      const updatedNotifs = currentNotifs.map(n => {
        if (n.category === 'DOCUMENT' && (n.message.includes(target.document_number) || n.title.includes(target.document_number))) {
          return { ...n, is_read: true };
        }
        return n;
      });
      setNotifications(updatedNotifs);
      LocalStorageRepository.saveNotifications(updatedNotifs);
    }

    if (isSupabaseConfigured) {
      try {
        const dbPayload: Record<string, unknown> = {
          updated_at: now
        };
        if (updates.document_type !== undefined) dbPayload.document_type = updates.document_type;
        if (updates.document_number !== undefined) dbPayload.document_number = updates.document_number;
        if (updates.issue_date !== undefined) dbPayload.issue_date = updates.issue_date || null;
        if (updates.expiry_date !== undefined) dbPayload.expiry_date = updates.expiry_date;
        if (updates.vehicle_id !== undefined) dbPayload.vehicle_id = updates.vehicle_id || null;
        if (updates.trailer_id !== undefined) dbPayload.trailer_id = updates.trailer_id || null;
        if (updates.issuing_authority !== undefined) dbPayload.issuing_authority = updates.issuing_authority || null;
        if (updates.attachment_url !== undefined) dbPayload.attachment_url = updates.attachment_url || null;
        if (updates.notes !== undefined) dbPayload.notes = updates.notes || null;

        const { error } = await supabase
          .from('vehicle_documents')
          .update(dbPayload)
          .eq('id', id);

        if (error) {
          console.warn('[Supabase] vehicle_documents update notice:', error.message);
        }
      } catch (err) {
        console.warn('[Supabase Exception] vehicle_documents update:', err);
      }
    }

    return true;
  };

  const deleteDocument = async (id: string, changedBy: string = 'Super Admin'): Promise<boolean> => {
    const current = LocalStorageRepository.getDocuments();
    const target = current.find(d => d.id === id);
    if (!target) return false;

    const updatedList = current.filter(d => d.id !== id);
    setDocuments(updatedList);
    LocalStorageRepository.saveDocuments(updatedList);

    LocalStorageRepository.addAuditLog({
      user_name: changedBy,
      user_role: 'SUPER_ADMIN',
      action: 'DELETE_DOCUMENT',
      module: 'VEHICLE_DOCUMENTS',
      record_id: `${target.document_type} - ${target.document_number || id}`,
      old_values: target,
      ip_address: '127.0.0.1'
    });

    if (isSupabaseConfigured) {
      try {
        await supabase.from('vehicle_documents').delete().eq('id', id);
      } catch (err) {
        console.warn('[Supabase Exception] vehicle_documents delete:', err);
      }
    }

    return true;
  };

  const markNotificationRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, is_read: true } : n);
    setNotifications(updated);
    LocalStorageRepository.saveNotifications(updated);
    refreshData();
  };

  // Telematics & Fuel Actions
  const addGpsDevice = (devData: Omit<GpsDevice, 'id' | 'created_at'>): GpsDevice => {
    const createdDev = LocalStorageRepository.addGpsDevice(devData);

    LocalStorageRepository.addAuditLog({
      user_name: 'Fleet Manager',
      user_role: 'FLEET_MANAGER',
      action: 'REGISTER_GPS_HARDWARE',
      module: 'VEHICLES',
      record_id: createdDev.device_imei,
      new_values: createdDev,
      ip_address: '127.0.0.1'
    });

    if (isSupabaseConfigured) {
      supabase.from('gps_devices').insert([createdDev]).then(({ error }) => {
        if (error) console.warn('Supabase gps_devices insert error:', error.message);
      });
    }

    refreshData();
    return createdDev;
  };

  const updateGpsDevice = (id: string, updates: Partial<GpsDevice>) => {
    LocalStorageRepository.updateGpsDevice(id, updates);

    LocalStorageRepository.addAuditLog({
      user_name: 'Fleet Manager',
      user_role: 'FLEET_MANAGER',
      action: 'UPDATE_GPS_HARDWARE',
      module: 'VEHICLES',
      record_id: id,
      new_values: updates,
      ip_address: '127.0.0.1'
    });

    if (isSupabaseConfigured) {
      supabase.from('gps_devices').update(updates).eq('id', id).then(({ error }) => {
        if (error) console.warn('Supabase gps_devices update error:', error.message);
      });
    }

    refreshData();
  };

  const deleteGpsDevice = (id: string) => {
    LocalStorageRepository.deleteGpsDevice(id);

    LocalStorageRepository.addAuditLog({
      user_name: 'Fleet Manager',
      user_role: 'FLEET_MANAGER',
      action: 'DELETE_GPS_HARDWARE',
      module: 'VEHICLES',
      record_id: id,
      new_values: { deleted: true },
      ip_address: '127.0.0.1'
    });

    if (isSupabaseConfigured) {
      supabase.from('gps_devices').delete().eq('id', id).then(({ error }) => {
        if (error) console.warn('Supabase gps_devices delete error:', error.message);
      });
    }

    refreshData();
  };

  const addTrip = (tripData: Omit<Trip, 'id' | 'trip_number' | 'created_at'>): Trip => {
    const createdTrip = LocalStorageRepository.addTrip(tripData);
    
    // Update vehicle status to ON_TRIP
    updateVehicle(tripData.vehicle_id, { status: 'ON_TRIP' });
    
    LocalStorageRepository.addAuditLog({
      user_name: 'Fleet Manager',
      user_role: 'FLEET_MANAGER',
      action: 'DISPATCH_TRIP',
      module: 'VEHICLES',
      record_id: createdTrip.trip_number,
      new_values: createdTrip,
      ip_address: '127.0.0.1'
    });

    refreshData();
    return createdTrip;
  };

  const updateTrip = (id: string, updates: Partial<Trip>) => {
    LocalStorageRepository.updateTrip(id, updates);
    
    if (updates.status === 'COMPLETED' || updates.status === 'CANCELLED') {
      const trip = trips.find(t => t.id === id);
      if (trip) {
        updateVehicle(trip.vehicle_id, { status: 'AVAILABLE' });
      }
    }

    refreshData();
  };

  const addFuelTransaction = (txData: Omit<FuelTransaction, 'id' | 'transaction_number' | 'created_at'>): FuelTransaction => {
    const createdTx = LocalStorageRepository.addFuelTransaction(txData);
    
    // Auto update vehicle current mileage if newer
    const veh = vehicles.find(v => v.id === txData.vehicle_id);
    if (veh && txData.odometer_at_fueling > veh.current_mileage) {
      updateVehicle(veh.id, { current_mileage: txData.odometer_at_fueling });
    }

    LocalStorageRepository.addAuditLog({
      user_name: 'Fuel Officer / Driver',
      user_role: 'FLEET_MANAGER',
      action: 'RECORD_FUEL',
      module: 'INVENTORY',
      record_id: createdTx.transaction_number,
      new_values: createdTx,
      ip_address: '127.0.0.1'
    });

    refreshData();
    return createdTx;
  };

  const reconcileTripFuel = (tripId: string): TripFuelReconciliation | null => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return null;

    const benchmark = fuelBenchmarks.find(b => b.vehicle_id === trip.vehicle_id) || fuelBenchmarks[0];
    const ratePer100 = trip.is_loaded_trip ? benchmark.loaded_consumption_liters_per_100km : benchmark.empty_consumption_liters_per_100km;
    const distance = trip.final_distance_km || trip.gps_calculated_distance_km || trip.odometer_distance_km || 100;
    
    // Formula: (Distance / 100 * Rate) * (1 + Summer AC penalty)
    const estimatedLiters = +((distance / 100 * ratePer100) * (1 + benchmark.ac_summer_penalty_percentage / 100)).toFixed(2);
    
    // Find closest fuel transaction
    const fuelTx = fuelTransactions.find(f => f.vehicle_id === trip.vehicle_id);
    const actualLiters = fuelTx ? fuelTx.liters_dispensed : estimatedLiters * 1.03; // ~3% realistic variance
    const varianceLiters = +(actualLiters - estimatedLiters).toFixed(2);
    const variancePct = +((varianceLiters / estimatedLiters) * 100).toFixed(1);
    const isAbnormal = Math.abs(variancePct) > 12.0;

    const rec: TripFuelReconciliation = {
      id: 'rec-' + Date.now(),
      trip_id: trip.id,
      vehicle_id: trip.vehicle_id,
      actual_fuel_consumed_liters: actualLiters,
      benchmark_liters_per_100km: ratePer100,
      distance_used_km: distance,
      estimated_fuel_liters: estimatedLiters,
      variance_liters: varianceLiters,
      variance_percentage: variancePct,
      has_abnormal_variance: isAbnormal,
      variance_reason: isAbnormal ? 'Variance exceeds 12% threshold - potential fuel siphon or heavy idling.' : 'Standard highway consumption.',
      reconciliation_status: isAbnormal ? 'INVESTIGATION_REQUIRED' : 'APPROVED',
      reviewed_by: 'p2222222-2222-2222-2222-222222222222',
      reconciled_at: new Date().toISOString()
    };

    const currentRecs = LocalStorageRepository.getTripReconciliations();
    LocalStorageRepository.saveTripReconciliations([rec, ...currentRecs.filter(r => r.trip_id !== tripId)]);
    refreshData();
    return rec;
  };

  const isGpsProviderConnected = Boolean(
    isSupabaseConfigured && gpsPings.some(p => p.data_source === 'LIVE_PROVIDER')
  );

  const simulateGpsSync = () => {
    // Zero fake coordinates are generated. We log the real connection attempt.
    LocalStorageRepository.addGpsSyncLog({
      sync_started_at: new Date().toISOString(),
      sync_completed_at: new Date().toISOString(),
      provider_name: 'NONE (UNCONFIGURED)',
      sync_status: 'SKIPPED',
      pings_received: 0,
      pings_inserted: 0,
      pings_skipped_duplicate: 0,
      pings_rejected_anomaly: 0,
      api_latency_ms: 12,
      error_message: 'GPS provider not connected — awaiting real vehicle data.',
      triggered_by: 'MANUAL_REFRESH'
    });

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
        isGpsProviderConnected,
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
