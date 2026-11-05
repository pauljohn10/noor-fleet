import React, { useState } from 'react';
import { 
  Navigation, Plus, CheckCircle2, Clock, AlertTriangle, Truck, 
  MapPin, Calendar, Check, X, ShieldCheck, FileText, ArrowRight, Gauge,
  Search, Filter, Download
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { Trip, TripStatus } from '../../types';
import { Modal } from '../common/Modal';
import { exportToExcel, exportToPDFReport } from '../../lib/exportUtils';

export const TripManager: React.FC = () => {
  const { 
    trips, vehicles, drivers, trailers, 
    addTrip, updateTrip, reconcileTripFuel 
  } = useFleet();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | TripStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  // New Trip Form State
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id || '');
  const [driverId, setDriverId] = useState(drivers[0]?.id || '');
  const [trailerId, setTrailerId] = useState(trailers[0]?.id || '');
  const [originName, setOriginName] = useState('Dammam Main Fuel Terminal Depot');
  const [destinationName, setDestinationName] = useState('Riyadh North Distribution Hub');
  const [cargoVolume, setCargoVolume] = useState('36000');
  const [cargoDescription, setCargoDescription] = useState('Diesel (Euro 5 Spec)');
  const [isLoaded, setIsLoaded] = useState(true);
  const [notes, setNotes] = useState('');

  const filteredTrips = trips.filter(t => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const veh = vehicles.find(v => v.id === t.vehicle_id);
      const drv = drivers.find(d => d.id === t.assigned_driver_id);
      return (
        t.trip_number.toLowerCase().includes(q) ||
        t.origin_name.toLowerCase().includes(q) ||
        t.destination_name.toLowerCase().includes(q) ||
        (veh && veh.vehicle_id.toLowerCase().includes(q)) ||
        (veh && veh.plate_number.toLowerCase().includes(q)) ||
        (drv && drv.full_name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    const selVeh = vehicles.find(v => v.id === vehicleId);

    addTrip({
      vehicle_id: vehicleId,
      assigned_driver_id: driverId || undefined,
      assigned_trailer_id: trailerId || undefined,
      origin_name: originName,
      destination_name: destinationName,
      cargo_description: cargoDescription,
      cargo_volume_liters: Number(cargoVolume) || 36000,
      is_loaded_trip: isLoaded,
      planned_departure: new Date().toISOString(),
      actual_departure: new Date().toISOString(),
      start_odometer_km: selVeh?.current_mileage || 140000,
      gps_calculated_distance_km: 0,
      distance_calculation_method: 'GPS_HAVERSINE_SUMMATION',
      data_quality: 'HIGH_CONFIDENCE',
      status: 'IN_PROGRESS',
      notes: notes || 'Dispatched via Trip Manager'
    });

    setIsModalOpen(false);
    setNotes('');
  };

  const handleCompleteTrip = (trip: Trip) => {
    const endOdo = (trip.start_odometer_km || 140000) + Math.round(trip.gps_calculated_distance_km || 280);
    updateTrip(trip.id, {
      status: 'COMPLETED',
      actual_arrival: new Date().toISOString(),
      end_odometer_km: endOdo,
      final_distance_km: trip.gps_calculated_distance_km || 280,
      data_quality: 'HIGH_CONFIDENCE'
    });

    // Automatically trigger fuel reconciliation
    reconcileTripFuel(trip.id);
  };

  const getStatusBadge = (status: TripStatus) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">IN PROGRESS</span>;
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">COMPLETED</span>;
      case 'PLANNED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">PLANNED</span>;
      case 'ARRIVED_AT_DESTINATION':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">ARRIVED</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">CANCELLED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">{status}</span>;
    }
  };

  const handleExportExcel = () => {
    const data = filteredTrips.map(t => {
      const veh = vehicles.find(v => v.id === t.vehicle_id);
      const drv = drivers.find(d => d.id === t.assigned_driver_id);
      const trl = trailers.find(tId => tId.id === t.assigned_trailer_id);
      return {
        'Trip Number': t.trip_number,
        'Vehicle Unit': veh ? `${veh.vehicle_id} (${veh.plate_number})` : 'N/A',
        'Tanker Trailer': trl ? `${trl.trailer_id} (${trl.plate_number})` : 'N/A',
        'Driver': drv ? drv.full_name : 'Unassigned',
        'Origin': t.origin_name,
        'Destination': t.destination_name,
        'Cargo': `${t.cargo_volume_liters || 0} L (${t.cargo_description})`,
        'Distance (KM)': t.final_distance_km || t.gps_calculated_distance_km || 0,
        'Status': t.status
      };
    });
    exportToExcel(data, 'Commercial_Trips_Dispatch');
  };

  const handleExportPDF = () => {
    const headers = ['Trip #', 'Vehicle Unit', 'Tanker Trailer', 'Driver', 'Origin Depot', 'Destination Hub', 'Cargo Volume', 'Distance', 'Status'];
    const rows = filteredTrips.map(t => {
      const veh = vehicles.find(v => v.id === t.vehicle_id);
      const drv = drivers.find(d => d.id === t.assigned_driver_id);
      const trl = trailers.find(tId => tId.id === t.assigned_trailer_id);
      return [
        t.trip_number,
        veh ? `${veh.vehicle_id} (${veh.plate_number})` : 'N/A',
        trl ? `${trl.trailer_id} (${trl.plate_number})` : 'Uncoupled',
        drv ? drv.full_name : 'Unassigned',
        t.origin_name,
        t.destination_name,
        `${(t.cargo_volume_liters || 0).toLocaleString()} L`,
        `${t.final_distance_km || t.gps_calculated_distance_km || 0} KM`,
        t.status.replace(/_/g, ' ')
      ];
    });

    const activeCount = trips.filter(t => t.status === 'IN_PROGRESS').length;
    const completedCount = trips.filter(t => t.status === 'COMPLETED').length;

    exportToPDFReport(
      'Commercial Fuel Trips & Route Dispatch Register',
      headers,
      rows,
      'Commercial_Trips_Report',
      {
        orientation: 'landscape',
        subtitle: 'Commercial Fleet Haulage Dispatches, GPS Route Distance & Destination Ledger',
        summaryKPIs: [
          { label: 'Total Trips', value: trips.length, color: 'slate' },
          { label: 'Active In Transit', value: activeCount, color: 'emerald' },
          { label: 'Completed Deliveries', value: completedCount, color: 'sky' }
        ],
        metadata: [
          { label: 'Status Filter', value: statusFilter },
          { label: 'Export Scope', value: `${filteredTrips.length} trips listed` }
        ]
      }
    );
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Page Header & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-3.5 rounded-md shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">TRIP & ROUTE DISPATCH MANAGEMENT</h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Dispatch fuel tanker trucks, calculate road distance, and verify odometer against GPS route history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded border border-slate-200 transition active:scale-95 cursor-pointer"
            title="Export to Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded border border-slate-200 transition active:scale-95 cursor-pointer"
            title="Export to PDF"
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          {canManage && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded transition shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Dispatch New Trip</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <span>Active Trips On Road</span>
            <Truck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {trips.filter(t => t.status === 'IN_PROGRESS').length}
          </div>
          <div className="text-[11px] text-emerald-700 mt-0.5 font-medium">In transit across logistics routes</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <span>Completed Trips</span>
            <CheckCircle2 className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {trips.filter(t => t.status === 'COMPLETED').length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Audited with odometer delta</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <span>Planned Dispatches</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {trips.filter(t => t.status === 'PLANNED').length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Scheduled for departure</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <span>Total Dispatched Distance</span>
            <Gauge className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {trips.reduce((acc, t) => acc + (t.final_distance_km || t.gps_calculated_distance_km || 0), 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">KM</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Calculated via Haversine & Odo</div>
        </div>
      </div>

      {/* Trips Master Table */}
      <div className="bg-white border border-slate-200 rounded-md shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-3 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Dispatched Trips Registry ({filteredTrips.length} of {trips.length})
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Real-time route manifests, cargo load state, and dual distance verification.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search trip #, truck, driver..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-7 pr-2.5 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 w-52 font-mono"
              />
            </div>

            <div className="flex rounded border border-slate-300 bg-white p-0.5 text-[11px]">
              {(['ALL', 'IN_PROGRESS', 'PLANNED', 'COMPLETED'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-2.5 py-0.5 font-medium rounded transition cursor-pointer ${
                    statusFilter === tab
                      ? 'bg-slate-900 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab === 'ALL' ? 'All' : tab === 'IN_PROGRESS' ? 'Active' : tab === 'PLANNED' ? 'Planned' : 'Completed'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3.5">Trip Number</th>
                <th className="py-2.5 px-3.5">Assigned Vehicle & Driver</th>
                <th className="py-2.5 px-3.5">Route Origin → Destination</th>
                <th className="py-2.5 px-3.5">Cargo & Payload</th>
                <th className="py-2.5 px-3.5">Distance Audit (KM)</th>
                <th className="py-2.5 px-3.5">Status</th>
                <th className="py-2.5 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    <Navigation className="w-6 h-6 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-xs text-slate-700">No trip records found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      No dispatches matched your search criteria.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTrips.map(trip => {
                  const veh = vehicles.find(v => v.id === trip.vehicle_id);
                  const drv = drivers.find(d => d.id === trip.assigned_driver_id);
                  const trl = trailers.find(t => t.id === trip.assigned_trailer_id);

                  return (
                    <tr key={trip.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Trip # */}
                      <td className="py-3 px-3.5">
                        <div className="font-mono font-bold text-slate-900">{trip.trip_number}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {new Date(trip.created_at).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Vehicle & Driver */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{veh?.vehicle_id || 'Unknown'}</span>
                          <span className="font-mono text-slate-800 bg-amber-100/70 border border-amber-300/60 px-1.5 py-0.2 rounded text-[10px] font-semibold">
                            {veh?.plate_number}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Driver: {drv ? drv.full_name : <span className="italic text-slate-400">Unassigned</span>}
                        </div>
                        {trl && (
                          <div className="text-[10px] text-slate-400">
                            Trailer: {trl.trailer_id} ({trl.plate_number})
                          </div>
                        )}
                      </td>

                      {/* Route */}
                      <td className="py-3 px-3.5 max-w-xs">
                        <div className="font-medium text-slate-800 truncate" title={trip.origin_name}>
                          From: {trip.origin_name}
                        </div>
                        <div className="text-slate-600 truncate mt-0.5" title={trip.destination_name}>
                          To: {trip.destination_name}
                        </div>
                      </td>

                      {/* Cargo */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-1">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            trip.is_loaded_trip 
                              ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {trip.is_loaded_trip ? 'LOADED' : 'EMPTY RETURN'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                          {trip.cargo_volume_liters?.toLocaleString()} L
                        </div>
                      </td>

                      {/* Distance */}
                      <td className="py-3 px-3.5">
                        <div className="font-mono font-bold text-slate-900">
                          {trip.final_distance_km ? `${trip.final_distance_km.toFixed(1)} KM` : (
                            trip.gps_calculated_distance_km ? `${trip.gps_calculated_distance_km.toFixed(1)} KM` : '--'
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Start Odo: {trip.start_odometer_km?.toLocaleString()} KM
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5">
                        {getStatusBadge(trip.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right space-x-1 whitespace-nowrap">
                        {canManage ? (
                          <>
                            {trip.status === 'IN_PROGRESS' && (
                              <button
                                onClick={() => handleCompleteTrip(trip)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition cursor-pointer"
                              >
                                Mark Arrived
                              </button>
                            )}
                            {trip.status === 'COMPLETED' && (
                              <button
                                onClick={() => reconcileTripFuel(trip.id)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded text-[11px] font-semibold transition cursor-pointer"
                              >
                                Reconcile Fuel
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispatch Trip Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Dispatch Fuel Transport Trip"
          subtitle="Assign tractor head truck, trailer, driver, route destination, and payload volume into logistics dispatch."
          maxWidth="3xl"
        >
          <form onSubmit={handleCreateTrip} className="space-y-4 text-xs font-sans">
            {/* Section 1: Fleet Assets & Driver */}
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-amber-500 text-slate-950 flex items-center justify-center font-black text-[11px]">1</span>
                  Fleet Asset & Driver Allocation
                </span>
                <span className="text-[11px] text-amber-700 font-semibold">* Required fields</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Tractor Truck <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={vehicleId}
                    onChange={e => setVehicleId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.vehicle_id} ({v.plate_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Fuel Tanker Trailer</label>
                  <select
                    value={trailerId}
                    onChange={e => setTrailerId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  >
                    <option value="">-- No Trailer Coupled --</option>
                    {trailers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.trailer_id} ({t.tank_capacity_liters.toLocaleString()} L)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Assigned Driver</label>
                  <select
                    value={driverId}
                    onChange={e => setDriverId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  >
                    <option value="">-- Unassigned --</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.full_name} ({d.employee_id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Route & Cargo */}
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-amber-500 text-slate-950 flex items-center justify-center font-black text-[11px]">2</span>
                  Route, Cargo & Gate Pass Notes
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Origin Terminal <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={originName}
                    onChange={e => setOriginName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Destination Hub <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={destinationName}
                    onChange={e => setDestinationName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Cargo Payload (Liters)</label>
                  <input
                    type="number"
                    value={cargoVolume}
                    onChange={e => setCargoVolume(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Cargo Description</label>
                  <input
                    type="text"
                    value={cargoDescription}
                    onChange={e => setCargoDescription(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Load Status</label>
                  <select
                    value={isLoaded ? 'LOADED' : 'EMPTY'}
                    onChange={e => setIsLoaded(e.target.value === 'LOADED')}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  >
                    <option value="LOADED">Loaded Tanker (56 L/100km)</option>
                    <option value="EMPTY">Empty Return (34 L/100km)</option>
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Dispatch & Gate Pass Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Aramco Ras Tanura fuel bill of lading #44120. Special night convoy escort."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                Confirm Dispatch
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
